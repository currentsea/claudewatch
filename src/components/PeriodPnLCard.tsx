import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ServerCrash,
  Receipt,
  Coins,
} from 'lucide-react';
import { SubscriptionTier, DailyActivity } from '../types';
import { TimeRange, formatCost, subscriptionMonthsElapsed } from '../utils/pricing';
import { TimeRangeSelector } from './TimeRangeSelector';

interface Props {
  range: TimeRange;
  onChangeRange: (range: TimeRange) => void;
  dailyActivity: DailyActivity[];
  totalApiCost: number;
  subscriptionCost: SubscriptionTier;
  subscriptionLabel: string;
  /** Cost reported by backend for the current billing period (used as a fallback for 'thisMonth'). */
  currentBillingPeriodCost: number;
  /** Reference billing period start, used only for the 'thisMonth' fast path. */
  billingPeriodStart: string;
}

/** Sum daily activity within a time range. */
function rangeStats(
  daily: DailyActivity[],
  startISO: string | null,
  endISO: string | null
): { cost: number; sessions: number; messages: number; days: number } {
  const start = startISO ? new Date(startISO) : null;
  const end = endISO ? new Date(endISO) : null;
  let cost = 0;
  let sessions = 0;
  let messages = 0;
  let days = 0;
  for (const d of daily) {
    const dayDate = new Date(d.date + 'T12:00:00Z');
    if (start && dayDate < start) continue;
    if (end && dayDate > end) continue;
    cost += d.estimatedCost || 0;
    sessions += d.sessionCount || 0;
    messages += d.messageCount || 0;
    days += 1;
  }
  return { cost, sessions, messages, days };
}

/**
 * The dashboard's main P&L stat card.
 *
 * Defaults to "this month" but exposes a time range selector so the user can
 * pivot to a custom window or all-time. Shows API equivalent cost,
 * subscription cost, and the net value (positive = subscription wins).
 */
export function PeriodPnLCard({
  range,
  onChangeRange,
  dailyActivity,
  totalApiCost,
  subscriptionCost,
  subscriptionLabel,
  currentBillingPeriodCost,
  billingPeriodStart,
}: Props) {
  // For 'allTime' we use the precomputed total (more accurate than summing dailyActivity)
  // For 'thisMonth' AND when the calendar month start matches the billing period start,
  // we prefer the backend's currentBillingPeriodCost.
  const stats = rangeStats(dailyActivity, range.startISO, range.endISO);

  let apiCost: number;
  if (range.preset === 'allTime') {
    apiCost = totalApiCost;
  } else if (range.preset === 'thisMonth') {
    // Use backend's billing-period cost (includes active windows that may straddle)
    const monthStart = range.startISO ? new Date(range.startISO).toISOString().slice(0, 10) : '';
    const billStart = new Date(billingPeriodStart).toISOString().slice(0, 10);
    apiCost = monthStart === billStart ? currentBillingPeriodCost : stats.cost;
  } else {
    apiCost = stats.cost;
  }

  // Subscription cost for the selected range (monthly fee × months in range, capped to 1 for short ranges)
  const monthsInRange = (() => {
    if (range.preset === 'allTime') {
      // Anchored to your $200/mo plan start (May 30, 2025) rather than the first
      // recorded session, so "all time" spans the full life of the subscription.
      return subscriptionMonthsElapsed();
    }
    if (range.preset === 'thisMonth') return 1;
    // Rolling presets: rough fraction of a 30-day month
    const start = range.startISO ? new Date(range.startISO).getTime() : 0;
    const end = range.endISO ? new Date(range.endISO).getTime() : Date.now();
    const days = Math.max(1, (end - start) / (24 * 60 * 60 * 1000));
    return Math.max(0.25, days / 30);
  })();

  // Whole months render without a trailing ".0"; fractional rolling-window
  // months keep one (or two, sub-month) decimals.
  const monthsLabel = Number.isInteger(monthsInRange)
    ? String(monthsInRange)
    : monthsInRange.toFixed(monthsInRange < 1 ? 2 : 1);

  const subTotal = subscriptionCost * monthsInRange;
  const netValue = apiCost - subTotal;
  const wins = netValue >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm">
      {/* glow background */}
      <div
        className={`pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl ${
          wins ? 'bg-emerald-500/10' : 'bg-amber-500/10'
        }`}
      />

      {/* Header — title + range selector */}
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
            <Receipt size={11} className="text-emerald-400" />
            P&amp;L · {range.label}
          </div>
          <h3 className="text-base font-bold text-white">
            Subscription Net Value
          </h3>
          <p className="text-xs text-slate-500">
            {subscriptionLabel}
            {monthsInRange !== 1 && ` · ${monthsLabel} mo`}
            {range.preset === 'allTime' && ' · since May 30, 2025'}
          </p>
        </div>
        <TimeRangeSelector value={range} onChange={onChangeRange} />
      </div>

      {/* Big number */}
      <div
        className={`mb-4 rounded-xl border p-4 ${
          wins
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-amber-500/30 bg-amber-500/5'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">
              {wins ? 'You came out ahead by' : 'API would have been cheaper by'}
            </p>
            <p
              className={`mt-0.5 text-3xl font-extrabold tracking-tight ${
                wins ? 'text-emerald-300' : 'text-amber-300'
              }`}
              data-testid="pnl-headline"
            >
              {wins ? '+' : '−'}
              {formatCost(Math.abs(netValue))}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {wins
                ? 'Subscription is paying off this period 🎉'
                : 'Pure API would have cost less in this range'}
            </p>
          </div>
          {wins ? (
            <TrendingUp size={26} className="shrink-0 text-emerald-400" />
          ) : (
            <TrendingDown size={26} className="shrink-0 text-amber-400" />
          )}
        </div>
      </div>

      {/* Two-column breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="flex items-center gap-1.5 text-xs text-amber-300/80">
            <ServerCrash size={11} />
            API equivalent
          </p>
          <p className="mt-0.5 text-xl font-bold text-amber-300">
            {formatCost(apiCost)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            At Anthropic's list rates
          </p>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
          <p className="flex items-center gap-1.5 text-xs text-blue-300/80">
            <Coins size={11} />
            You paid
          </p>
          <p className="mt-0.5 text-xl font-bold text-blue-300">
            {formatCost(subTotal)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {monthsInRange === 1
              ? `${formatCost(subscriptionCost)}/mo subscription`
              : `${formatCost(subscriptionCost)}/mo × ${monthsLabel}`}
          </p>
        </div>
      </div>

      {/* Stats footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/40 pt-3 text-[11px] text-slate-500">
        <span>{stats.days} active day{stats.days === 1 ? '' : 's'}</span>
        <span>{stats.sessions.toLocaleString()} session{stats.sessions === 1 ? '' : 's'}</span>
        <span>{stats.messages.toLocaleString()} message{stats.messages === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}
