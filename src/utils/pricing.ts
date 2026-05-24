import { PricingSettings, SubscriptionTier } from '../types';

// ── Default pricing constants ─────────────────────────────────────────────────

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  modelPricing: {
    opus: { input: 15.0, output: 75.0, cacheCreation: 18.75, cacheRead: 1.5 },
    sonnet: { input: 3.0, output: 15.0, cacheCreation: 3.75, cacheRead: 0.3 },
    haiku: { input: 0.8, output: 4.0, cacheCreation: 1.0, cacheRead: 0.08 },
  },
  subscriptionTiers: { pro: 20, max5x: 100, max20x: 200 },
};

export const STORAGE_KEY = 'burnitdown-pricing-settings';

export function loadPricingSettings(): PricingSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRICING_SETTINGS;
    const parsed = JSON.parse(raw) as PricingSettings;
    // Deep-merge with defaults so new fields always exist
    return {
      modelPricing: {
        opus: { ...DEFAULT_PRICING_SETTINGS.modelPricing.opus, ...parsed.modelPricing?.opus },
        sonnet: { ...DEFAULT_PRICING_SETTINGS.modelPricing.sonnet, ...parsed.modelPricing?.sonnet },
        haiku: { ...DEFAULT_PRICING_SETTINGS.modelPricing.haiku, ...parsed.modelPricing?.haiku },
      },
      subscriptionTiers: { ...DEFAULT_PRICING_SETTINGS.subscriptionTiers, ...parsed.subscriptionTiers },
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
 * the user's first session. Used to compute total subscription revenue paid.
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
 * From Anthropic's perspective:
 *   revenue  = subscriptionCost × monthsActive
 *   cost     = totalApiCost (approximate compute cost to serve you)
 *   profit   = revenue − cost   (positive = Anthropic gains, negative = Anthropic loses)
 */
export function anthropicPnL(
  subscriptionCost: SubscriptionTier,
  totalApiCost: number,
  firstSessionDate: string | null
): { revenue: number; cost: number; profit: number; months: number } {
  const months = monthsActive(firstSessionDate);
  const revenue = subscriptionCost * months;
  const cost = totalApiCost;
  return { revenue, cost, profit: revenue - cost, months };
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
