import React, { useState } from 'react';
import { Flame, TrendingUp, TrendingDown, Info, X } from 'lucide-react';
import { SubscriptionTier } from '../types';
import { anthropicPnL, formatCost } from '../utils/pricing';

interface Props {
  subscriptionCost: SubscriptionTier;
  totalApiCost: number;
  currentPeriodCost: number;
  subscriptionLabel: string;
  billingPeriodStart?: string;
}

/**
 * Click-to-open explainer that shows the math behind the headline
 * "+/− $X for Anthropic" figure.
 */
function PnlExplainer({
  show,
  onClose,
  subscriptionCost,
  revenue,
  cost,
  profit,
  months,
  subsidising,
}: {
  show: boolean;
  onClose: () => void;
  subscriptionCost: number;
  totalApiCost: number;
  revenue: number;
  cost: number;
  profit: number;
  months: number;
  subsidising: boolean;
}) {
  if (!show) return null;
  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-700/60 bg-slate-900 p-4 text-xs text-slate-400 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold text-slate-200">
          How "{subsidising ? '−' : '+'}{formatCost(Math.abs(profit))} for Anthropic" is calculated
        </span>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-300">
          <X size={12} />
        </button>
      </div>

      <div className="space-y-2">
        <p>
          From Anthropic's perspective, profit = the money you paid them minus
          the money it cost them to serve your usage.
        </p>

        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>
            <span className="font-medium text-slate-300">Revenue</span>: your
            monthly fee × months subscribed (since May 30, 2025).
          </li>
          <li>
            <span className="font-medium text-slate-300">Compute cost</span>:
            every token in your{' '}
            <code className="rounded bg-slate-800/60 px-1">~/.claude</code>{' '}
            sessions priced at Anthropic's published API list rates (their
            internal compute cost is lower than list — list is the public
            upper bound).
          </li>
          <li>
            <span className="font-medium text-slate-300">Profit</span>: revenue
            − compute cost.
          </li>
        </ol>

        <div className="rounded-lg border border-slate-700/40 bg-black/30 p-2 font-mono text-[10px] leading-5">
          <div>
            <span className="text-emerald-400">revenue</span> ={' '}
            ${subscriptionCost.toFixed(2)}/mo × {months} mo ={' '}
            <span className="text-emerald-400">{formatCost(revenue)}</span>
          </div>
          <div>
            <span className="text-amber-400">cost</span> = Σ(tokens × rate ÷ 1M) ={' '}
            <span className="text-amber-400">{formatCost(cost)}</span>
          </div>
          <div className="mt-1 border-t border-slate-700/40 pt-1">
            <span className={subsidising ? 'text-red-400' : 'text-emerald-400'}>
              profit
            </span>
            {' '}= {formatCost(revenue)} − {formatCost(cost)} ={' '}
            <span className={subsidising ? 'text-red-400' : 'text-emerald-400'}>
              {profit >= 0 ? '+' : '−'}{formatCost(Math.abs(profit))}
            </span>
          </div>
        </div>

        <p>
          <strong className="text-slate-300">
            {subsidising ? 'Negative' : 'Positive'}
          </strong>{' '}
          {subsidising
            ? 'means Anthropic is currently eating compute cost beyond what you have paid them. Common for heavy Opus users on Pro/Max plans.'
            : 'means Anthropic has collected more from you in subscription fees than it has spent in (list-price-equivalent) compute. Their actual margin is even larger.'}
        </p>

        <p className="text-slate-500">
          Period: <strong className="text-slate-400">all-time</strong> since
          your $200/mo plan started (May 30, 2025) — per-month splits are
          intentionally omitted because they're too noisy to be useful.
        </p>

        <p className="text-slate-500">
          Sources:{' '}
          <a
            href="https://docs.anthropic.com/en/docs/about-claude/pricing"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-slate-300"
          >
            anthropic API pricing docs
          </a>
          {' · '}
          <a
            href="https://claude.ai/upgrade"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-slate-300"
          >
            claude.ai plans
          </a>
        </p>
        <p className="text-slate-600 text-[10px]">
          Note: list price is a proxy for Anthropic's true compute cost (their
          actual unit economics are lower). ClaudeWatch cannot read Anthropic's
          internal infra costs, so we use the public-facing rate.
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
 *
 * Only reports all-time figures — per-billing-period subsidy was removed
 * because the math is too noisy month-to-month to be trustworthy.
 */
export function SubsidyHero({
  subscriptionCost,
  totalApiCost,
  subscriptionLabel,
}: Props) {
  const [showPnlExplainer, setShowPnlExplainer] = useState(false);

  const { revenue, cost, profit, months } = anthropicPnL(
    subscriptionCost,
    totalApiCost
  );

  const subsidy = Math.max(0, cost - revenue);
  const surplus = Math.max(0, revenue - cost);
  const youArePaying = Math.min(revenue, cost);

  const denominator = Math.max(cost, revenue, 0.01);
  const paidPct = (youArePaying / denominator) * 100;
  const subsidyPct = (subsidy / denominator) * 100;
  const surplusPct = (surplus / denominator) * 100;

  const subsidising = profit < 0;

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
            paid (since May 30, 2025).{' '}
            {subsidising
              ? 'Your subscription does not cover the data-center spend behind your usage.'
              : 'Your subscription comfortably covers the data-center spend behind your usage.'}
          </p>
        </div>

        <div className="relative flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={() => setShowPnlExplainer((v) => !v)}
            aria-label="Show how this profit/loss figure is calculated"
            data-testid="pnl-badge-explainer"
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              subsidising
                ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15 focus:ring-red-400/50'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15 focus:ring-emerald-400/50'
            }`}
          >
            {subsidising ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
            {subsidising
              ? `−${formatCost(Math.abs(profit))} for Anthropic`
              : `+${formatCost(profit)} for Anthropic`}
            <Info size={11} className="opacity-60" />
          </button>
          <p className="text-[10px] text-slate-600">
            All-time · {months} month{months !== 1 ? 's' : ''} · click for math
          </p>

          <PnlExplainer
            show={showPnlExplainer}
            onClose={() => setShowPnlExplainer(false)}
            subscriptionCost={subscriptionCost}
            totalApiCost={totalApiCost}
            revenue={revenue}
            cost={cost}
            profit={profit}
            months={months}
            subsidising={subsidising}
          />
        </div>
      </div>

      {/* ── The split bar ──────────────────────────────────────────────────── */}
      <div className="relative">
        <div className="mb-2 flex justify-between text-xs text-slate-500">
          <span>Total compute cost to serve you · {formatCost(cost)}</span>
          <span>Subscription revenue paid · {formatCost(revenue)}</span>
        </div>

        <div className="relative h-10 w-full overflow-hidden rounded-lg bg-slate-900/60 ring-1 ring-slate-700/40">
          <div
            className="absolute left-0 top-0 flex h-full items-center justify-end overflow-hidden bg-gradient-to-r from-emerald-500/70 to-emerald-400/70 pr-2 text-xs font-semibold text-white"
            style={{ width: `${paidPct}%` }}
          >
            {paidPct > 18 ? `You paid ${formatCost(youArePaying)}` : ''}
          </div>
          {subsidyPct > 0 && (
            <div
              className="absolute top-0 flex h-full items-center justify-center overflow-hidden border-l border-red-300/40 bg-gradient-to-r from-red-500/70 to-red-600/70 px-2 text-xs font-semibold text-white"
              style={{ left: `${paidPct}%`, width: `${subsidyPct}%` }}
            >
              {subsidyPct > 14 ? `Anthropic ate ${formatCost(subsidy)}` : ''}
            </div>
          )}
          {surplusPct > 0 && (
            <div
              className="absolute top-0 flex h-full items-center justify-center overflow-hidden border-l border-emerald-300/40 bg-gradient-to-r from-emerald-400/40 to-emerald-300/40 px-2 text-xs font-semibold text-emerald-100"
              style={{ left: `${paidPct}%`, width: `${surplusPct}%` }}
            >
              {surplusPct > 14 ? `Anthropic kept ${formatCost(surplus)}` : ''}
            </div>
          )}
        </div>

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
    </div>
  );
}
