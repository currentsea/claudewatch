import React, { useState } from 'react';
import { Flame, TrendingUp, TrendingDown, ServerCrash, Info, X } from 'lucide-react';
import { SubscriptionTier } from '../types';
import { anthropicPnL, formatCost } from '../utils/pricing';

interface Props {
  subscriptionCost: SubscriptionTier;
  totalApiCost: number;
  currentPeriodCost: number;
  firstSessionDate: string | null;
  subscriptionLabel: string;
  billingPeriodStart?: string;
}

/**
 * Formats a date range for the current billing period.
 * e.g. "May 1 – May 25, 2026"
 */
function formatPeriodRange(periodStart: string): string {
  const start = new Date(periodStart);
  const now = new Date();
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

/**
 * Small info tooltip that shows on hover/click.
 */
function SubsidyTooltip({ show, onClose }: { show: boolean; onClose: () => void }) {
  if (!show) return null;
  return (
    <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-slate-700/60 bg-slate-900 p-4 text-xs text-slate-400 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-slate-200">How "This-period subsidy" is calculated</span>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-300">
          <X size={12} />
        </button>
      </div>

      <div className="space-y-2">
        <p>
          <span className="font-medium text-slate-300">This-period API cost</span>{' '}
          is computed by reading every assistant message in your{' '}
          <code className="rounded bg-slate-800/60 px-1">~/.claude/projects</code>{' '}
          JSONL files that falls within the current billing period.
        </p>
        <p>
          Each message's token counts (input, output, cache write, cache read)
          are multiplied by the corresponding per-token rate from{' '}
          <a
            href="https://www.anthropic.com/pricing"
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 underline hover:text-blue-300"
          >
            anthropic.com/pricing
          </a>
          {' '}and summed across all models.
        </p>
        <div className="rounded-lg border border-slate-700/40 bg-black/30 p-2 font-mono text-[10px] leading-5">
          <div><span className="text-yellow-400">API cost</span> = Σ(tokens × rate / 1M)</div>
          <div className="mt-1"><span className="text-red-400">Subsidy</span> = max(0, API cost − subscription)</div>
        </div>
        <p className="text-slate-500">
          Source:{' '}
          <a
            href="https://docs.anthropic.com/en/docs/about-claude/pricing"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-slate-300"
          >
            docs.anthropic.com/en/docs/about-claude/pricing
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * The dashboard's headline component.
 *
 * Answers: "Of what it actually costs Anthropic to serve me,
 * how much am I paying for vs. how much are they eating?"
 */
export function SubsidyHero({
  subscriptionCost,
  totalApiCost,
  currentPeriodCost,
  firstSessionDate,
  subscriptionLabel,
  billingPeriodStart,
}: Props) {
  const [showTooltip, setShowTooltip] = useState(false);

  const { revenue, cost, profit, months } = anthropicPnL(
    subscriptionCost,
    totalApiCost,
    firstSessionDate
  );

  // Subsidy = extra compute Anthropic ate beyond what you paid.
  const subsidy = Math.max(0, cost - revenue);
  const surplus = Math.max(0, revenue - cost);
  const youArePaying = Math.min(revenue, cost);

  // Bar segments (normalised to the larger of cost vs revenue)
  const denominator = Math.max(cost, revenue, 0.01);
  const paidPct = (youArePaying / denominator) * 100;
  const subsidyPct = (subsidy / denominator) * 100;
  const surplusPct = (surplus / denominator) * 100;

  // Period-level numbers
  const periodSubsidy = Math.max(0, currentPeriodCost - subscriptionCost);

  const subsidising = profit < 0;

  // Period label
  const periodRange = billingPeriodStart
    ? formatPeriodRange(billingPeriodStart)
    : `${months} month${months !== 1 ? 's' : ''}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-black/10 p-6 backdrop-blur-sm">
      {/* Glow background */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/0 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-500/10 to-blue-500/0 blur-3xl" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative mb-5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
            <Flame size={12} className="text-orange-400" />
            All-time P&amp;L · {subscriptionLabel}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {subsidising ? (
              <>
                Anthropic is eating{' '}
                <span className="text-red-400">
                  {formatCost(Math.abs(profit))}
                </span>{' '}
                of compute cost to serve you.
              </>
            ) : (
              <>
                You've paid Anthropic{' '}
                <span className="text-emerald-400">
                  {formatCost(profit)}
                </span>{' '}
                more than your compute actually cost them.
              </>
            )}
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Based on{' '}
            <span className="text-white">{months} billing month{months !== 1 ? 's' : ''}</span>{' '}
            of usage.{' '}
            {subsidising
              ? 'Your subscription does not cover the data-center spend behind your usage.'
              : 'Your subscription comfortably covers the data-center spend behind your usage.'}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${
              subsidising
                ? 'border-red-500/30 bg-red-500/10 text-red-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {subsidising ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
            {subsidising
              ? `−${formatCost(Math.abs(profit))} for Anthropic`
              : `+${formatCost(profit)} for Anthropic`}
          </div>
          <p className="text-[10px] text-slate-600">
            All-time · {months} month{months !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── The split bar ──────────────────────────────────────────────────── */}
      <div className="relative">
        <div className="mb-2 flex justify-between text-xs text-slate-500">
          <span>Total compute cost to serve you · {formatCost(cost)}</span>
          <span>Subscription revenue paid · {formatCost(revenue)}</span>
        </div>

        <div className="relative h-10 w-full overflow-hidden rounded-lg bg-slate-900/60 ring-1 ring-slate-700/40">
          {/* What you paid for */}
          <div
            className="absolute left-0 top-0 flex h-full items-center justify-end overflow-hidden bg-gradient-to-r from-emerald-500/70 to-emerald-400/70 pr-2 text-xs font-semibold text-white"
            style={{ width: `${paidPct}%` }}
          >
            {paidPct > 18 ? `You paid ${formatCost(youArePaying)}` : ''}
          </div>
          {/* Subsidy (Anthropic eats) */}
          {subsidyPct > 0 && (
            <div
              className="absolute top-0 flex h-full items-center justify-center overflow-hidden border-l border-red-300/40 bg-gradient-to-r from-red-500/70 to-red-600/70 px-2 text-xs font-semibold text-white"
              style={{ left: `${paidPct}%`, width: `${subsidyPct}%` }}
            >
              {subsidyPct > 14 ? `Anthropic ate ${formatCost(subsidy)}` : ''}
            </div>
          )}
          {/* Surplus (Anthropic keeps) */}
          {surplusPct > 0 && (
            <div
              className="absolute top-0 flex h-full items-center justify-center overflow-hidden border-l border-emerald-300/40 bg-gradient-to-r from-emerald-400/40 to-emerald-300/40 px-2 text-xs font-semibold text-emerald-100"
              style={{ left: `${paidPct}%`, width: `${surplusPct}%` }}
            >
              {surplusPct > 14 ? `Anthropic kept ${formatCost(surplus)}` : ''}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
            What you paid that was used to serve you
          </span>
          {subsidising && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-red-500" /> Compute cost
              Anthropic ate (the "subsidy")
            </span>
          )}
          {!subsidising && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-emerald-300" /> Margin
              Anthropic kept
            </span>
          )}
        </div>
      </div>

      {/* ── Period strip ───────────────────────────────────────────────────── */}
      <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* This billing period */}
        <div className="rounded-xl border border-slate-700/40 bg-black/10 p-3">
          <p className="text-xs text-slate-500">This billing period</p>
          <p className="text-[10px] text-slate-600 font-mono mt-0.5">{periodRange}</p>
          <p
            className={`mt-1 text-lg font-bold ${
              currentPeriodCost > subscriptionCost
                ? 'text-red-300'
                : 'text-emerald-300'
            }`}
          >
            {formatCost(currentPeriodCost)} API equiv.
          </p>
          <p className="text-xs text-slate-500">
            vs {formatCost(subscriptionCost)} you paid this month
          </p>
        </div>

        {/* This-period subsidy — with tooltip */}
        <div className="relative rounded-xl border border-slate-700/40 bg-black/10 p-3">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <ServerCrash size={11} className="text-red-400" />
            This-period subsidy
            <button
              type="button"
              onClick={() => setShowTooltip((v) => !v)}
              className="ml-auto rounded-full p-0.5 text-slate-600 hover:text-slate-300 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-500"
              aria-label="How is this-period subsidy calculated?"
            >
              <Info size={11} />
            </button>
          </p>

          <SubsidyTooltip
            show={showTooltip}
            onClose={() => setShowTooltip(false)}
          />

          <p className="mt-0.5 text-lg font-bold text-red-300">
            {periodSubsidy > 0 ? `−${formatCost(periodSubsidy)}` : '$0.00'}
          </p>
          <p className="text-xs text-slate-500">
            {periodSubsidy > 0
              ? 'Anthropic eating this month'
              : 'No subsidy needed this month'}
          </p>
        </div>

        {/* API-rate comparison pane */}
        <div className="rounded-xl border border-slate-700/40 bg-black/10 p-3">
          <p className="text-xs text-slate-500">
            If you paid pure API rates…
          </p>
          <p
            className={`mt-0.5 text-lg font-bold ${
              currentPeriodCost > subscriptionCost
                ? 'text-emerald-300'
                : 'text-amber-300'
            }`}
          >
            {currentPeriodCost > subscriptionCost
              ? `+${formatCost(currentPeriodCost - subscriptionCost)} saved`
              : `−${formatCost(subscriptionCost - currentPeriodCost)} more`}
          </p>
          <p className="text-xs text-slate-500">
            {currentPeriodCost > subscriptionCost
              ? 'API would have cost more — subscription wins 🎉'
              : 'API would have been cheaper this period'}
          </p>
          <div className={`mt-2 rounded-md border px-2 py-1 text-xs ${
            currentPeriodCost > subscriptionCost
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
          }`}>
            {currentPeriodCost > subscriptionCost
              ? '📈 Anthropic would lose money at API rates too'
              : '📊 Anthropic profits even at API rates'}
          </div>
        </div>
      </div>
    </div>
  );
}
