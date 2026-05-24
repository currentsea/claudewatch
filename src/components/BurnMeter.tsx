import React from 'react';
import { Flame } from 'lucide-react';
import { SubscriptionTier } from '../types';
import { formatCost, projectMonthly } from '../utils/pricing';

interface Props {
  currentPeriodCost: number;
  billingPeriodStart: string;
  subscriptionCost: SubscriptionTier;
}

export function BurnMeter({
  currentPeriodCost,
  billingPeriodStart,
  subscriptionCost,
}: Props) {
  const projected = projectMonthly(currentPeriodCost, billingPeriodStart);
  const pct = Math.min((currentPeriodCost / subscriptionCost) * 100, 100);
  const projectedPct = Math.min((projected / subscriptionCost) * 100, 100);
  const isOverBudget = projected > subscriptionCost;

  const start = new Date(billingPeriodStart);
  const now = new Date();
  const daysElapsed = Math.max(
    1,
    Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const daysInMonth = 30;
  const periodPct = Math.min((daysElapsed / daysInMonth) * 100, 100);

  // Burn rate color
  const barColor =
    pct < 50 ? 'from-emerald-500 to-emerald-400' :
    pct < 80 ? 'from-amber-500 to-amber-400' :
    'from-red-500 to-red-400';

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Burn Rate</h3>
          <p className="text-xs text-slate-500">
            Current billing period — day {daysElapsed} of ~{daysInMonth}
          </p>
        </div>
        <Flame
          size={18}
          className={isOverBudget ? 'text-red-400' : 'text-amber-400'}
        />
      </div>

      {/* Period progress */}
      <div className="mb-5">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>Period elapsed</span>
          <span>{periodPct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-slate-500 transition-all duration-500"
            style={{ width: `${periodPct}%` }}
          />
        </div>
      </div>

      {/* Cost progress */}
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>API equivalent consumed</span>
          <span className="font-medium text-white">
            {formatCost(currentPeriodCost)} / ${subscriptionCost}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>0</span>
          <span>${subscriptionCost}</span>
        </div>
      </div>

      {/* Projected */}
      <div className={`rounded-xl p-3 ${isOverBudget ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
        <p className="text-xs text-slate-400">
          At this pace, projected monthly API cost:
        </p>
        <p className={`text-lg font-bold ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`}>
          {formatCost(projected)}
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({projectedPct.toFixed(0)}% of sub)
          </span>
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {isOverBudget
            ? `⚠️  Exceeds ${formatCost(subscriptionCost)}/mo subscription by ${formatCost(projected - subscriptionCost)}`
            : `✓  ${formatCost(subscriptionCost - projected)} below subscription value`}
        </p>
      </div>
    </div>
  );
}
