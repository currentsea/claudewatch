import React from 'react';
import { TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { SubscriptionTier } from '../types';
import {
  anthropicPnL,
  getCustomerRating,
  formatCost,
} from '../utils/pricing';

interface Props {
  subscriptionCost: SubscriptionTier;
  totalApiCost: number;
  firstSessionDate: string | null;
  /** Estimated monthly cost (USD) for Anthropic to deliver the Claude Design feature. */
  claudeDesignMonthlyCost?: number;
}

/**
 * Anthropic-side P&L panel. Shows only the all-time figure — per-month
 * estimates are too noisy to report meaningfully (compute prices change,
 * billing-period boundaries vary), so we removed them.
 */
export function AnthropicPnL({
  subscriptionCost,
  totalApiCost,
  firstSessionDate,
  claudeDesignMonthlyCost = 0,
}: Props) {
  const { revenue, cost, designCost, profit, months } = anthropicPnL(
    subscriptionCost,
    totalApiCost,
    firstSessionDate,
    claudeDesignMonthlyCost
  );
  const hasDesignCost = designCost > 0;

  const profitMargin = revenue > 0 ? profit / revenue : 0;
  const rating = getCustomerRating(profitMargin);

  const isLosingAllTime = profit < 0;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Anthropic's All-Time P&amp;L on You
          </h3>
          <p className="text-xs text-slate-500">
            Sub revenue vs estimated compute cost over {months} month
            {months !== 1 ? 's' : ''}
          </p>
        </div>
        {isLosingAllTime ? (
          <TrendingDown size={18} className="text-red-400 mt-0.5" />
        ) : (
          <TrendingUp size={18} className="text-emerald-400 mt-0.5" />
        )}
      </div>

      {/* ── Customer rating badge ───────────────────────────────────────────── */}
      <div
        className={`flex items-center gap-3 rounded-xl border p-4 ${rating.bgColor} ${rating.borderColor}`}
      >
        <span className="text-3xl leading-none">{rating.emoji}</span>
        <div>
          <p className={`font-bold text-base ${rating.color}`}>
            {rating.label}
          </p>
          <p className="text-xs text-slate-400">{rating.sublabel}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-slate-500">Profit margin</p>
          <p className={`text-lg font-bold ${rating.color}`}>
            {(profitMargin * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* ── All-time headline ───────────────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-700/40 p-4">
        <p className="mb-1 text-xs text-slate-500">All-time net to Anthropic</p>
        <p
          className={`text-2xl font-bold ${
            isLosingAllTime ? 'text-red-400' : 'text-emerald-400'
          }`}
        >
          {isLosingAllTime ? '−' : '+'}
          {formatCost(Math.abs(profit))}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {formatCost(revenue)} subscription revenue
          {' · '}
          {formatCost(cost)} in compute (API list-price equiv.)
          {hasDesignCost && (
            <>
              {' · '}
              {formatCost(designCost)} Claude Design delivery
            </>
          )}
        </p>
      </div>

      {/* ── Breakdown row ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={12} className="text-slate-500" />
          <p className="text-xs font-medium text-slate-400">How this is calculated</p>
        </div>
        <div className="space-y-1 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>Subscription revenue ({months} × {formatCost(subscriptionCost)})</span>
            <span className="text-emerald-400 font-medium">{formatCost(revenue)}</span>
          </div>
          <div className="flex justify-between">
            <span>Estimated compute cost (API-rate equivalent)</span>
            <span className="text-red-400 font-medium">− {formatCost(cost)}</span>
          </div>
          {hasDesignCost && (
            <div className="flex justify-between">
              <span>
                Claude Design feature delivery ({months} × {formatCost(claudeDesignMonthlyCost)})
              </span>
              <span className="text-red-400 font-medium">− {formatCost(designCost)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-700/60 pt-1 mt-1">
            <span className="font-medium text-slate-300">Net to Anthropic</span>
            <span
              className={`font-bold ${
                profit >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {profit >= 0 ? '+' : '−'}
              {formatCost(Math.abs(profit))}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        * Compute cost is approximated using public Anthropic API rates. Actual
        infrastructure margins vary; this is illustrative, not Anthropic's real P&amp;L.
        Per-month figures are intentionally omitted — short windows are too noisy
        to report meaningfully.
      </p>
    </div>
  );
}
