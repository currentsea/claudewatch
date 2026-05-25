import React from 'react';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { SubscriptionTier, UsageData } from '../types';
import { formatCost, formatTokens } from '../utils/pricing';

interface Props {
  data: UsageData;
  subscriptionCost: SubscriptionTier;
}

/**
 * Visual flowchart showing how each input number becomes the final P&L.
 *
 *   ┌─ Input tokens ──┐
 *   │  Output tokens  │ × per-model rate / 1M  →  per-model $
 *   │  Cache writes   │
 *   │  Cache reads    │
 *   └─────────────────┘                            ↓
 *                          Σ across all models  =  Total compute $
 *                                                  ↓
 *               Subscription paid  −  Total compute $  =  Anthropic P&L
 */
export function CostFlowDiagram({ data, subscriptionCost }: Props) {
  const { totalStats, computedCosts, modelPricing } = data;
  const modelEntries = Object.entries(computedCosts.byModel);

  // Compute each token bucket's contribution to total cost
  const allInputCost = modelEntries.reduce(
    (sum, [, v]) => sum + (v.tokens.inputTokens / 1_000_000) * (modelPricing[v.tier]?.input ?? 0),
    0
  );
  const allOutputCost = modelEntries.reduce(
    (sum, [, v]) => sum + (v.tokens.outputTokens / 1_000_000) * (modelPricing[v.tier]?.output ?? 0),
    0
  );
  const allCacheWriteCost = modelEntries.reduce(
    (sum, [, v]) =>
      sum + (v.tokens.cacheCreationInputTokens / 1_000_000) * (modelPricing[v.tier]?.cacheCreation ?? 0),
    0
  );
  const allCacheReadCost = modelEntries.reduce(
    (sum, [, v]) =>
      sum + (v.tokens.cacheReadInputTokens / 1_000_000) * (modelPricing[v.tier]?.cacheRead ?? 0),
    0
  );

  const totalCost = computedCosts.totalApiCost;
  const pnl = subscriptionCost - computedCosts.currentPeriodCost;
  const subsidising = pnl < 0;

  const tokenBuckets = [
    {
      label: 'Input tokens',
      tokens: totalStats.totalInputTokens,
      cost: allInputCost,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
    },
    {
      label: 'Output tokens',
      tokens: totalStats.totalOutputTokens,
      cost: allOutputCost,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/30',
    },
    {
      label: 'Cache writes',
      tokens: totalStats.totalCacheCreate,
      cost: allCacheWriteCost,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
    },
    {
      label: 'Cache reads',
      tokens: totalStats.totalCacheRead,
      cost: allCacheReadCost,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">
          How these numbers are computed
        </h3>
        <p className="text-xs text-slate-500">
          Every token your Claude session consumed → per-model rate → total →
          compared to your flat subscription. Trace the dollars end-to-end.
        </p>
      </div>

      {/* ── Step 1: token buckets ─────────────────────────────────────────── */}
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span className="rounded-md bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-300">
          1
        </span>
        Token usage from <code className="text-slate-400">~/.claude/projects</code>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tokenBuckets.map((b) => (
          <div
            key={b.label}
            className={`rounded-xl border p-3 ${b.bg} ${b.border}`}
          >
            <p className={`text-xs font-medium ${b.color}`}>{b.label}</p>
            <p className="mt-0.5 text-base font-bold text-white">
              {formatTokens(b.tokens)}
            </p>
            <p className="text-xs text-slate-500">≈ {formatCost(b.cost)}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center text-slate-600">
        <ArrowDown size={18} />
      </div>

      {/* ── Step 2: rate × tokens ─────────────────────────────────────────── */}
      <div className="my-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span className="rounded-md bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-300">
          2
        </span>
        Multiply each bucket by the model's published API rate
      </div>
      <div className="rounded-xl border border-slate-700/40 bg-black/10 p-3">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-700/60">
                <th className="py-1.5 text-left font-medium">Model tier</th>
                <th className="px-2 py-1.5 text-right font-medium">Input</th>
                <th className="px-2 py-1.5 text-right font-medium">Output</th>
                <th className="px-2 py-1.5 text-right font-medium">Cache write</th>
                <th className="px-2 py-1.5 text-right font-medium">Cache read</th>
                <th className="px-2 py-1.5 text-right font-medium">$ to date</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {(['opus', 'sonnet', 'haiku'] as const).map((tier) => {
                const p = modelPricing[tier];
                if (!p) return null;
                const tierCost = modelEntries
                  .filter(([, v]) => v.tier === tier)
                  .reduce((s, [, v]) => s + v.cost, 0);
                return (
                  <tr key={tier} className="border-b border-slate-700/30 last:border-0">
                    <td className="py-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: p.color }}
                      />{' '}
                      {p.displayName}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      ${p.input.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      ${p.output.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      ${p.cacheCreation.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      ${p.cacheRead.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold text-amber-300">
                      {formatCost(tierCost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[10px] text-slate-600">
          Rates are USD per 1M tokens, from{' '}
          <a
            href="https://docs.anthropic.com/en/docs/about-claude/pricing"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-slate-400"
          >
            docs.anthropic.com/en/docs/about-claude/pricing
          </a>
          .
        </p>
      </div>

      <div className="flex items-center justify-center text-slate-600">
        <ArrowDown size={18} />
      </div>

      {/* ── Step 3: subtotal ──────────────────────────────────────────────── */}
      <div className="my-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span className="rounded-md bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-300">
          3
        </span>
        Sum across all models = the compute cost to serve you
      </div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center">
        <p className="text-xs text-amber-300/80">
          Σ of all models, all time
        </p>
        <p className="mt-0.5 text-2xl font-bold text-amber-300">
          {formatCost(totalCost)}
        </p>
        <p className="text-xs text-slate-500">
          what Anthropic's data centres spent on your usage (approx)
        </p>
      </div>

      <div className="flex items-center justify-center text-slate-600">
        <ArrowDown size={18} />
      </div>

      {/* ── Step 4: comparison ────────────────────────────────────────────── */}
      <div className="my-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span className="rounded-md bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-300">
          4
        </span>
        Subtract from this period's subscription revenue
      </div>
      <div className="grid grid-cols-3 items-center gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
          <p className="text-xs text-emerald-300/80">You paid this period</p>
          <p className="text-xl font-bold text-emerald-300">
            {formatCost(subscriptionCost)}
          </p>
        </div>
        <div className="flex flex-col items-center text-slate-500">
          <span className="text-xs">minus</span>
          <ArrowRight size={20} />
          <span className="text-xs">equals</span>
        </div>
        <div
          className={`rounded-xl border p-3 text-center ${
            subsidising
              ? 'border-red-500/30 bg-red-500/10'
              : 'border-emerald-500/30 bg-emerald-500/10'
          }`}
        >
          <p
            className={`text-xs ${
              subsidising ? 'text-red-300/80' : 'text-emerald-300/80'
            }`}
          >
            Anthropic this period
          </p>
          <p
            className={`text-xl font-bold ${
              subsidising ? 'text-red-300' : 'text-emerald-300'
            }`}
          >
            {pnl >= 0 ? '+' : '−'}
            {formatCost(Math.abs(pnl))}
          </p>
        </div>
      </div>

      {/* ── Caveats ───────────────────────────────────────────────────────── */}
      <div className="mt-5 rounded-xl border border-slate-700/40 bg-black/20 p-3">
        <p className="mb-1.5 text-xs font-semibold text-slate-300">
          What this number is — and is not
        </p>
        <ul className="space-y-1 text-xs text-slate-500">
          <li>
            • <span className="text-slate-300">Is:</span> the dollar value of
            your tokens if you paid the public API list price.
          </li>
          <li>
            • <span className="text-slate-300">Is not:</span> Anthropic's actual
            margin. Their cost of inference is lower than list price (GPU
            amortisation, custom silicon, batch efficiencies). API list price
            is the closest publicly observable upper bound.
          </li>
          <li>
            • Subscription overhead (support, R&amp;D, payments, abuse) is{' '}
            <em>not</em> deducted — the real P&amp;L is worse than what we show.
          </li>
        </ul>
      </div>
    </div>
  );
}
