import Anthropic from '@anthropic-ai/sdk';
import { env } from '../utils/env';

export type ClaudeTurnRole = 'user' | 'assistant';

export interface ClaudeTurn {
  role: ClaudeTurnRole;
  content: string;
}

export type ArchiveNeeds = 'none' | 'partial' | 'full' | null;

export interface ExtractedAnswers {
  blockchains: string[];
  request_volume_per_month: number | null;
  archive_needs: ArchiveNeeds;
  geo_preference: string | null;
  budget_monthly_cents: number | null;
}

export interface ClaudeChatResult {
  assistantText: string;
  extractedAnswers: ExtractedAnswers;
  rawText: string;
}

const anthropic = new Anthropic({ apiKey: env.CLAUDE_API_KEY });

export const SCRIPTED_GREETING_QUESTION =
  "Hi — I can recommend the right plan. Which blockchains do you need, roughly how many requests per month, do you need archive/historical data, any region preference (US/EU/APAC/global), and what’s your monthly budget?";

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant that recommends a subscription tier for a blockchain data product.

You MUST return two parts:
1) A user-facing reply.
2) A machine-readable JSON object wrapped in <answers>...</answers> tags.

The JSON schema is:
{
  "blockchains": string[],
  "request_volume_per_month": number|null,
  "archive_needs": "none"|"partial"|"full"|null,
  "geo_preference": string|null,
  "budget_monthly_cents": number|null
}

Return null when a field cannot be inferred.
Do not include any other keys.
`;

const emptyAnswers = (): ExtractedAnswers => ({
  blockchains: [],
  request_volume_per_month: null,
  archive_needs: null,
  geo_preference: null,
  budget_monthly_cents: null,
});

export const parseClaudeReply = (rawText: string): ClaudeChatResult => {
  const answersMatch = rawText.match(/<answers>([\s\S]*?)<\/answers>/i);

  let extractedAnswers = emptyAnswers();
  if (answersMatch && answersMatch[1]) {
    try {
      const parsed = JSON.parse(answersMatch[1].trim()) as Partial<ExtractedAnswers>;
      extractedAnswers = {
        blockchains: Array.isArray(parsed.blockchains) ? parsed.blockchains.filter((v) => typeof v === 'string') : [],
        request_volume_per_month:
          typeof parsed.request_volume_per_month === 'number' ? parsed.request_volume_per_month : null,
        archive_needs:
          parsed.archive_needs === 'none' || parsed.archive_needs === 'partial' || parsed.archive_needs === 'full'
            ? parsed.archive_needs
            : null,
        geo_preference: typeof parsed.geo_preference === 'string' ? parsed.geo_preference : null,
        budget_monthly_cents: typeof parsed.budget_monthly_cents === 'number' ? parsed.budget_monthly_cents : null,
      };
    } catch {
      extractedAnswers = emptyAnswers();
    }
  }

  const assistantText = rawText
    .replace(/<answers>[\s\S]*?<\/answers>/gi, '')
    .trim();

  return {
    assistantText,
    extractedAnswers,
    rawText,
  };
};

export const chatWithClaude = async (params: {
  model: string;
  turns: ClaudeTurn[];
  systemPrompt?: string;
  maxTokens?: number;
}): Promise<ClaudeChatResult> => {
  const system = params.systemPrompt ? `${DEFAULT_SYSTEM_PROMPT}\n\n${params.systemPrompt}` : DEFAULT_SYSTEM_PROMPT;

  const result = await anthropic.messages.create({
    model: params.model,
    max_tokens: params.maxTokens ?? 800,
    system,
    messages: params.turns.map((t) => ({ role: t.role, content: t.content })),
  });

  const rawText = result.content
    .map((block) => {
      if (block.type === 'text') {
        return block.text;
      }
      return '';
    })
    .join('')
    .trim();

  return parseClaudeReply(rawText);
};
