import request from 'supertest';

jest.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
  supabaseAdmin: {},
}));

jest.mock('../../repositories/conversations', () => ({
  ensureUserRow: jest.fn(),
  getConversationById: jest.fn(),
  createConversation: jest.fn(),
  listRecentMessages: jest.fn(),
  insertMessage: jest.fn(),
}));

jest.mock('../../services/claude', () => ({
  SCRIPTED_GREETING_QUESTION: 'GREETING_QUESTION',
  chatWithClaude: jest.fn(),
}));

jest.mock('../../services/pricing', () => ({
  getPricingRecommendation: jest.fn(),
}));

describe('POST /api/chat', () => {
  beforeEach(() => {
    const { supabase } = require('../../utils/supabase') as {
      supabase: { auth: { getUser: jest.Mock } };
    };

    supabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          user_metadata: {},
          app_metadata: {},
        },
      },
      error: null,
    });
  });

  it('requires authentication', async () => {
    const app = (await import('../../app')).default;

    const res = await request(app).post('/api/chat').send({ message: 'hello' });

    expect(res.status).toBe(401);
  });

  it('stores greeting + user + assistant message and pricing snapshot', async () => {
    const conversationsRepo = require('../../repositories/conversations') as {
      ensureUserRow: jest.Mock;
      getConversationById: jest.Mock;
      createConversation: jest.Mock;
      listRecentMessages: jest.Mock;
      insertMessage: jest.Mock;
    };

    const { chatWithClaude } = require('../../services/claude') as {
      chatWithClaude: jest.Mock;
    };

    const { getPricingRecommendation } = require('../../services/pricing') as {
      getPricingRecommendation: jest.Mock;
    };

    conversationsRepo.ensureUserRow.mockResolvedValue(undefined);
    conversationsRepo.getConversationById.mockResolvedValue(null);
    conversationsRepo.createConversation.mockResolvedValue({
      id: 'conv-1',
      user_id: 'user-1',
      title: 'Pricing Recommendation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      model: 'claude-3-sonnet-20240229',
      system_prompt: null,
      is_archived: false,
      is_deleted: false,
    });
    conversationsRepo.listRecentMessages.mockResolvedValue([]);
    conversationsRepo.insertMessage.mockResolvedValue({
      id: 'msg-1',
      conversation_id: 'conv-1',
      user_id: 'user-1',
      role: 'assistant',
      content: 'ok',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tokens_used: 0,
      model: 'claude-3-sonnet-20240229',
      metadata: {},
    });

    chatWithClaude.mockResolvedValue({
      assistantText: 'Assistant response',
      extractedAnswers: {
        blockchains: ['ethereum'],
        request_volume_per_month: 123456,
        archive_needs: 'full',
        geo_preference: 'us',
        budget_monthly_cents: 2000,
      },
      rawText: 'raw',
    });

    getPricingRecommendation.mockResolvedValue({
      tier: {
        id: 'tier-1',
        tier_name: 'pro',
        display_name: 'Pro',
        description: 'For power users',
        price_monthly_cents: 1500,
        price_yearly_cents: 15000,
        features: ['f1'],
        limits: {},
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      summary: 'Recommended: Pro',
      benefits: ['f1'],
      payment_cta: {
        provider: 'stripe',
        tier_name: 'pro',
        display_name: 'Pro',
        price_monthly_cents: 1500,
        price_yearly_cents: 15000,
        checkout_path: '/api/v1/billing/checkout?tier=pro',
      },
      selection_reasons: ['reason'],
    });

    const app = (await import('../../app')).default;

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer test-token')
      .send({ message: 'I need Ethereum, 100k req/mo, full archive, US, $20' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.conversation_id).toBe('conv-1');
    expect(res.body.data.recommendation.summary).toBe('Recommended: Pro');

    expect(conversationsRepo.insertMessage).toHaveBeenCalledTimes(3);

    const assistantInsertCalls = conversationsRepo.insertMessage.mock.calls.filter(
      (c: unknown[]) => (c[0] as { role: string }).role === 'assistant'
    );

    const assistantRecommendationCall = assistantInsertCalls.find(
      (c: unknown[]) => (c[0] as { content: string }).content === 'Assistant response'
    );

    expect(assistantRecommendationCall).toBeTruthy();

    const assistantPayload = assistantRecommendationCall![0] as { metadata: Record<string, unknown> };
    expect(assistantPayload.metadata.extracted_answers).toBeTruthy();
    expect(assistantPayload.metadata.pricing_snapshot).toBeTruthy();
  });
});
