import type { PricingConfig } from '../types';
import { supabaseAdmin } from '../utils/supabase';
import type { ExtractedAnswers } from './claude';

export interface PaymentCtaPayload {
  provider: 'stripe';
  tier_name: string;
  display_name: string;
  price_monthly_cents: number;
  price_yearly_cents: number | null;
  checkout_path: string;
}

export interface PricingRecommendation {
  tier: PricingConfig;
  summary: string;
  benefits: string[];
  payment_cta: PaymentCtaPayload;
  selection_reasons: string[];
}

const asNumber = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];

const getTierCapability = (tier: PricingConfig) => {
  const limits = tier.limits as Record<string, unknown>;
  const supportsArchive = typeof limits.supports_archive === 'boolean' ? limits.supports_archive : false;
  const supportedGeos = asStringArray(limits.supported_geos);
  const requestsPerMonthLimit =
    asNumber(limits.requests_per_month) ?? asNumber(limits.messages_per_month) ?? asNumber(limits.conversations_per_month);

  return { supportsArchive, supportedGeos, requestsPerMonthLimit };
};

export const fetchActivePricingConfig = async (): Promise<PricingConfig[]> => {
  const { data, error } = await supabaseAdmin
    .from('pricing_config')
    .select('*')
    .eq('is_active', true)
    .order('price_monthly_cents', { ascending: true });

  if (error) {
    throw error;
  }

  return (data as PricingConfig[]) || [];
};

export const recommendPricingTier = (params: {
  answers: ExtractedAnswers;
  tiers: PricingConfig[];
}): PricingRecommendation => {
  const { answers } = params;
  const tiers = [...params.tiers].sort((a, b) => a.price_monthly_cents - b.price_monthly_cents);

  const firstTier = tiers[0];
  if (!firstTier) {
    throw new Error('No pricing tiers provided');
  }

  const requestedVolume = answers.request_volume_per_month ?? 0;
  const budget = answers.budget_monthly_cents;
  const needsArchive = answers.archive_needs === 'partial' || answers.archive_needs === 'full';

  const qualifies = (tier: PricingConfig): { ok: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    const { supportsArchive, supportedGeos, requestsPerMonthLimit } = getTierCapability(tier);

    if (needsArchive && !supportsArchive) {
      return { ok: false, reasons: ['Does not support archive data'] };
    }

    if (answers.geo_preference && supportedGeos.length > 0 && !supportedGeos.includes(answers.geo_preference)) {
      return { ok: false, reasons: [`Not available in preferred region (${answers.geo_preference})`] };
    }

    if (requestsPerMonthLimit !== null && requestsPerMonthLimit !== -1 && requestedVolume > requestsPerMonthLimit) {
      return { ok: false, reasons: ['Does not meet requested volume'] };
    }

    if (budget !== null && tier.price_monthly_cents > budget) {
      return { ok: false, reasons: ['Above stated budget'] };
    }

    if (needsArchive) {
      reasons.push('Includes archive data support');
    }

    if (requestedVolume > 0) {
      reasons.push(`Fits estimated volume (~${requestedVolume.toLocaleString()} requests/month)`);
    }

    if (budget !== null) {
      reasons.push(`Fits budget (≤ $${(budget / 100).toFixed(0)}/mo)`);
    }

    return { ok: true, reasons };
  };

  const qualifying = tiers
    .map((tier) => ({ tier, check: qualifies(tier) }))
    .filter((t) => t.check.ok);

  const chosen =
    qualifying[0] ??
    ({ tier: firstTier, check: { ok: true, reasons: ['Best available option'] } } as const);

  const tier = chosen.tier;
  const benefits = Array.isArray(tier.features) ? tier.features : [];
  const priceMonthly = (tier.price_monthly_cents / 100).toFixed(0);

  const payment_cta: PaymentCtaPayload = {
    provider: 'stripe',
    tier_name: tier.tier_name,
    display_name: tier.display_name,
    price_monthly_cents: tier.price_monthly_cents,
    price_yearly_cents: tier.price_yearly_cents ?? null,
    checkout_path: `/api/v1/billing/checkout?tier=${encodeURIComponent(tier.tier_name)}`,
  };

  return {
    tier,
    summary: `Recommended: ${tier.display_name} — $${priceMonthly}/mo`,
    benefits,
    payment_cta,
    selection_reasons: chosen.check.reasons,
  };
};

export const getPricingRecommendation = async (answers: ExtractedAnswers): Promise<PricingRecommendation> => {
  const tiers = await fetchActivePricingConfig();
  if (tiers.length === 0) {
    throw new Error('No active pricing configuration found');
  }

  return recommendPricingTier({ answers, tiers });
};
