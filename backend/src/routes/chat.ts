import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { SCRIPTED_GREETING_QUESTION, chatWithClaude } from '../services/claude';
import type { ClaudeTurn, ExtractedAnswers } from '../services/claude';
import { getPricingRecommendation } from '../services/pricing';
import {
  createConversation,
  ensureUserRow,
  getConversationById,
  insertMessage,
  listRecentMessages,
} from '../repositories/conversations';

const router = Router();

const chatRequestSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  message: z.string().min(1),
  model: z.string().min(1).optional(),
});

type ChatRequestBody = z.infer<typeof chatRequestSchema>;

const toClaudeTurns = (messages: Array<{ role: string; content: string }>): ClaudeTurn[] =>
  messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as ClaudeTurn['role'], content: m.content }));

const emptyAnswers: ExtractedAnswers = {
  blockchains: [],
  request_volume_per_month: null,
  archive_needs: null,
  geo_preference: null,
  budget_monthly_cents: null,
};

router.post('/', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const parsed = chatRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(', '),
      });
      return;
    }

    const body: ChatRequestBody = parsed.data;

    await ensureUserRow({ userId, email: req.user?.email });

    const existingConversation = body.conversation_id
      ? await getConversationById({ conversationId: body.conversation_id, userId })
      : null;

    const conversation =
      existingConversation ??
      (await createConversation({
        userId,
        model: body.model,
        title: 'Pricing Recommendation',
      }));

    const recentMessages = await listRecentMessages({ conversationId: conversation.id, limit: 20 });

    const turns: ClaudeTurn[] = toClaudeTurns(recentMessages);

    if (turns.length === 0) {
      await insertMessage({
        conversationId: conversation.id,
        userId,
        role: 'assistant',
        content: SCRIPTED_GREETING_QUESTION,
        model: conversation.model,
        metadata: { type: 'greeting' },
      });
      turns.push({ role: 'assistant', content: SCRIPTED_GREETING_QUESTION });
    }

    await insertMessage({
      conversationId: conversation.id,
      userId,
      role: 'user',
      content: body.message,
      model: conversation.model,
    });
    turns.push({ role: 'user', content: body.message });

    const claude = await chatWithClaude({
      model: body.model ?? conversation.model,
      turns,
      systemPrompt: conversation.system_prompt,
    });

    const extractedAnswers = claude.extractedAnswers ?? emptyAnswers;
    const recommendation = await getPricingRecommendation(extractedAnswers);

    const pricingSnapshot = {
      computed_at: new Date().toISOString(),
      answers: extractedAnswers,
      recommendation: {
        tier_name: recommendation.tier.tier_name,
        display_name: recommendation.tier.display_name,
        price_monthly_cents: recommendation.tier.price_monthly_cents,
        price_yearly_cents: recommendation.tier.price_yearly_cents ?? null,
        features: recommendation.tier.features,
        limits: recommendation.tier.limits,
        selection_reasons: recommendation.selection_reasons,
      },
    };

    await insertMessage({
      conversationId: conversation.id,
      userId,
      role: 'assistant',
      content: claude.assistantText,
      model: body.model ?? conversation.model,
      metadata: {
        extracted_answers: extractedAnswers,
        pricing_snapshot: pricingSnapshot,
      },
    });

    res.json({
      success: true,
      data: {
        conversation_id: conversation.id,
        assistant_message: claude.assistantText,
        extracted_answers: extractedAnswers,
        recommendation: {
          summary: recommendation.summary,
          benefits: recommendation.benefits,
          tier: {
            id: recommendation.tier.id,
            tier_name: recommendation.tier.tier_name,
            display_name: recommendation.tier.display_name,
            description: recommendation.tier.description,
            price_monthly_cents: recommendation.tier.price_monthly_cents,
            price_yearly_cents: recommendation.tier.price_yearly_cents ?? null,
            features: recommendation.tier.features,
          },
          payment_cta: recommendation.payment_cta,
        },
      },
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat request',
    });
  }
});

export default router;
