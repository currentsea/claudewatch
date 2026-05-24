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
