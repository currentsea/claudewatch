import { SubscriptionTier } from '../types';

export const SUBSCRIPTION_TIERS: {
  value: SubscriptionTier;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    value: 20,
    label: 'Pro',
    description: '$20 / mo',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/50',
  },
  {
    value: 100,
    label: 'Max 5×',
    description: '$100 / mo',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/50',
  },
  {
    value: 200,
    label: 'Max 20×',
    description: '$200 / mo',
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/50',
  },
];

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
