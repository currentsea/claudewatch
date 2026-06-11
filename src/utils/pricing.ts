import { PricingSettings, SubscriptionTier } from '../types';

// ── Default pricing constants ─────────────────────────────────────────────────

// Defaults reflect current Anthropic API pricing as of June 2026.
// Latest models: Fable 5 (frontier tier above Opus, $10/$50), Opus 4.8
// (most capable Opus-tier), Sonnet 4.6 (balanced), Haiku 4.5 (fastest).
// Opus 4.5–4.8 are $5/$25 per MTok (down from $15/$75 on Opus 4.1).
// Sonnet 4.5/4.6 stay at $3/$15. Haiku 4.5 is $1/$5 (Haiku 3.5 was $0.80/$4).
// Cache write is 1.25× input; cache read is 0.1× input — same multipliers on
// every tier, Fable 5 included.
// Source: https://platform.claude.com/docs/en/about-claude/models/overview
export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  modelPricing: {
    fable: { input: 10.0, output: 50.0, cacheCreation: 12.5, cacheRead: 1.0 },
    opus: { input: 5.0, output: 25.0, cacheCreation: 6.25, cacheRead: 0.5 },
    sonnet: { input: 3.0, output: 15.0, cacheCreation: 3.75, cacheRead: 0.3 },
    haiku: { input: 1.0, output: 5.0, cacheCreation: 1.25, cacheRead: 0.1 },
  },
  subscriptionTiers: { pro: 20, max5x: 100, max20x: 200 },
  // Estimated monthly cost (USD) for Anthropic to deliver the Claude Design
  // feature. Illustrative default — editable in Pricing Settings.
  claudeDesignMonthlyCost: 5,
};

export const STORAGE_KEY = 'claudewatch-pricing-settings';
const LEGACY_STORAGE_KEY = 'burnitdown-pricing-settings';

export function loadPricingSettings(): PricingSettings {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    // One-time migration from legacy key
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        raw = legacy;
        try {
          localStorage.setItem(STORAGE_KEY, legacy);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {}
      }
    }
    if (!raw) return DEFAULT_PRICING_SETTINGS;
    const parsed = JSON.parse(raw) as PricingSettings;
    // Deep-merge with defaults so new fields always exist
    return {
      modelPricing: {
        fable: { ...DEFAULT_PRICING_SETTINGS.modelPricing.fable, ...parsed.modelPricing?.fable },
        opus: { ...DEFAULT_PRICING_SETTINGS.modelPricing.opus, ...parsed.modelPricing?.opus },
        sonnet: { ...DEFAULT_PRICING_SETTINGS.modelPricing.sonnet, ...parsed.modelPricing?.sonnet },
        haiku: { ...DEFAULT_PRICING_SETTINGS.modelPricing.haiku, ...parsed.modelPricing?.haiku },
      },
      subscriptionTiers: { ...DEFAULT_PRICING_SETTINGS.subscriptionTiers, ...parsed.subscriptionTiers },
      claudeDesignMonthlyCost:
        parsed.claudeDesignMonthlyCost ?? DEFAULT_PRICING_SETTINGS.claudeDesignMonthlyCost,
    };
  } catch {
    return DEFAULT_PRICING_SETTINGS;
  }
}

export function savePricingSettings(s: PricingSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

// ── Subscription tier display helpers ────────────────────────────────────────

export function buildSubscriptionTiers(costs: PricingSettings['subscriptionTiers']) {
  return [
    {
      value: costs.pro,
      label: 'Pro',
      description: `$${costs.pro} / mo`,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/50',
    },
    {
      value: costs.max5x,
      label: 'Max 5×',
      description: `$${costs.max5x} / mo`,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/50',
    },
    {
      value: costs.max20x,
      label: 'Max 20×',
      description: `$${costs.max20x} / mo`,
      color: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10',
      border: 'border-fuchsia-500/50',
    },
  ] as const;
}

/** Convenience export using the defaults (used in places that don't need custom tiers) */
export const SUBSCRIPTION_TIERS = buildSubscriptionTiers(
  DEFAULT_PRICING_SETTINGS.subscriptionTiers
);

export function formatCost(usd: number): string {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(2)}k`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export function savings(subscriptionCost: SubscriptionTier, apiCost: number): number {
  return subscriptionCost - apiCost;
}

/**
 * Project the current-period cost to a full month based on days elapsed.
 */
export function projectMonthly(
  currentCost: number,
  periodStart: string
): number {
  const start = new Date(periodStart);
  const now = new Date();
  const daysElapsed = Math.max(
    1,
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysInMonth = 30;
  return (currentCost / daysElapsed) * daysInMonth;
}

/** Returns e.g. "Feb 2026" */
export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Estimate how many full (or partial) billing months have elapsed since
 * the user's first session. Kept as a general helper; subscription-revenue
 * math is anchored to {@link SUBSCRIPTION_START_DATE} via
 * {@link subscriptionMonthsElapsed} instead, so the P&L reflects the real
 * subscription rather than when local usage data happens to start.
 */
export function monthsActive(firstSessionDate: string | null): number {
  if (!firstSessionDate) return 1;
  const start = new Date(firstSessionDate);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) +
    1; // +1 to include the current partial month
  return Math.max(1, months);
}

/**
 * The date you upgraded to the $200/mo Max 20× plan. All subscription-duration
 * math is anchored here rather than the first recorded session, so the P&L
 * reflects your real subscription rather than when local usage data starts.
 * Hardcoded by request — change this if your plan began on a different date.
 */
export const SUBSCRIPTION_START_DATE = '2025-05-30T00:00:00';

/**
 * Whole months of subscription service elapsed since {@link SUBSCRIPTION_START_DATE},
 * floored at 1. A month is only counted once its day-of-month anchor is
 * reached, so the one-year anniversary returns 12 — today's fresh renewal pays
 * for the upcoming (not-yet-consumed) month and is excluded.
 */
export function subscriptionMonthsElapsed(now: Date = new Date()): number {
  const start = new Date(SUBSCRIPTION_START_DATE);
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  return Math.max(1, months);
}

/**
 * From Anthropic's perspective:
 *   revenue     = subscriptionCost × subscriptionMonthsElapsed
 *   cost        = totalApiCost (approximate compute cost to serve you)
 *   designCost  = claudeDesignMonthlyCost × subscriptionMonthsElapsed (cost to
 *                 deliver the Claude Design feature, tracked as its own line item)
 *   profit      = revenue − cost − designCost
 *                 (positive = Anthropic gains, negative = Anthropic loses)
 *
 * Months are counted from {@link SUBSCRIPTION_START_DATE}, not the first
 * recorded session.
 */
export function anthropicPnL(
  subscriptionCost: SubscriptionTier,
  totalApiCost: number,
  claudeDesignMonthlyCost = 0
): {
  revenue: number;
  cost: number;
  designCost: number;
  profit: number;
  months: number;
} {
  const months = subscriptionMonthsElapsed();
  const revenue = subscriptionCost * months;
  const cost = totalApiCost;
  const designCost = claudeDesignMonthlyCost * months;
  return { revenue, cost, designCost, profit: revenue - cost - designCost, months };
}

export type CustomerRating = {
  emoji: string;
  label: string;
  sublabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
};

/** Returns a fun label describing what kind of customer you are for Anthropic. */
export function getCustomerRating(profitMargin: number): CustomerRating {
  if (profitMargin > 0.8)
    return {
      emoji: '😴',
      label: 'Light Sleeper',
      sublabel: "Anthropic's most profitable customer type",
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
    };
  if (profitMargin > 0.5)
    return {
      emoji: '😊',
      label: 'Casual User',
      sublabel: 'Comfortable margin for Anthropic',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    };
  if (profitMargin > 0.1)
    return {
      emoji: '⚖️',
      label: 'Fair Exchange',
      sublabel: 'Getting good value, Anthropic still profitable',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    };
  if (profitMargin > -0.1)
    return {
      emoji: '🎯',
      label: 'Break-Even',
      sublabel: "Right at Anthropic's cost threshold",
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
    };
  if (profitMargin > -0.5)
    return {
      emoji: '🔥',
      label: 'Power User',
      sublabel: "Anthropic is subsidising your usage",
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    };
  return {
    emoji: '🚀',
    label: 'Absolute Unit',
    sublabel: "You're basically Anthropic's loss leader",
    color: 'text-fuchsia-400',
    bgColor: 'bg-fuchsia-500/10',
    borderColor: 'border-fuchsia-500/30',
  };
}

// ── Time range helpers (for dashboard P&L period selector) ────────────────────

export type TimeRangePreset = 'thisMonth' | 'last7' | 'last30' | 'last90' | 'allTime' | 'custom';

export interface TimeRange {
  preset: TimeRangePreset;
  /** ISO start date (inclusive). Null = open-ended (all time). */
  startISO: string | null;
  /** ISO end date (inclusive). Null = now. */
  endISO: string | null;
  label: string;
}

export function buildTimeRange(preset: TimeRangePreset, custom?: { startISO: string; endISO: string }): TimeRange {
  const now = new Date();
  if (preset === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      preset,
      startISO: start.toISOString(),
      endISO: now.toISOString(),
      label: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
  }
  if (preset === 'last7') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { preset, startISO: start.toISOString(), endISO: now.toISOString(), label: 'Last 7 days' };
  }
  if (preset === 'last30') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { preset, startISO: start.toISOString(), endISO: now.toISOString(), label: 'Last 30 days' };
  }
  if (preset === 'last90') {
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return { preset, startISO: start.toISOString(), endISO: now.toISOString(), label: 'Last 90 days' };
  }
  if (preset === 'custom' && custom) {
    return {
      preset,
      startISO: custom.startISO,
      endISO: custom.endISO,
      label: `${new Date(custom.startISO).toLocaleDateString()} – ${new Date(custom.endISO).toLocaleDateString()}`,
    };
  }
  return { preset: 'allTime', startISO: null, endISO: null, label: 'All time' };
}
