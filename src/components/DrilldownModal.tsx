import React, { useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { ComputedCosts, ModelPricing } from '../types';
import { formatCost, formatTokens } from '../utils/pricing';

interface DrilldownRow {
  label: string;
  value: string;
  sub?: string;
  indent?: boolean;
  highlight?: 'green' | 'red' | 'amber' | 'blue';
  separator?: boolean;
}

interface DrilldownModalProps {
  title: string;
  subtitle?: string;
  rows: DrilldownRow[];
  note?: React.ReactNode;
  onClose: () => void;
}

function DrilldownModal({ title, subtitle, rows, note, onClose }: DrilldownModalProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-t-2xl border border-slate-700/60 bg-slate-900 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-700/60 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Calculation breakdown
            </p>
            <h2 className="text-base font-bold text-white">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          <div className="space-y-1">
            {rows.map((row, i) => {
              if (row.separator) {
                return (
                  <div key={i} className="my-3 border-t border-slate-700/60" />
                );
              }

              const valueColor =
                row.highlight === 'green'
                  ? 'text-emerald-400'
                  : row.highlight === 'red'
                  ? 'text-red-400'
                  : row.highlight === 'amber'
                  ? 'text-amber-400'
                  : row.highlight === 'blue'
                  ? 'text-blue-400'
                  : 'text-slate-300';

              return (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-4 rounded-lg px-3 py-2 ${
                    row.indent
                      ? 'ml-4 bg-black/10 text-xs'
                      : 'text-sm bg-black/5'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`${row.indent ? 'text-slate-400' : 'font-medium text-slate-300'} truncate`}>
                      {row.label}
                    </p>
                    {row.sub && (
                      <p className="text-[10px] text-slate-600">{row.sub}</p>
                    )}
                  </div>
                  <p className={`shrink-0 font-mono font-semibold ${valueColor}`}>
                    {row.value}
                  </p>
                </div>
              );
            })}
          </div>

          {note && (
            <div className="mt-4 flex gap-2 rounded-xl border border-slate-700/40 bg-black/20 p-3 text-xs text-slate-500">
              <Info size={13} className="mt-0.5 shrink-0 text-slate-600" />
              <div>{note}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Drilldown factory functions ───────────────────────────────────────────────

/** Builds the breakdown for "This Period API Cost" */
export function PeriodApiCostDrilldown({
  computedCosts,
  modelPricing,
  periodStart,
  subscriptionCost,
  onClose,
}: {
  computedCosts: ComputedCosts;
  modelPricing: Record<string, ModelPricing>;
  periodStart: string;
  subscriptionCost: number;
  onClose: () => void;
}) {
  const periodLabel = new Date(periodStart).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const rows: DrilldownRow[] = [];

  // Per-model breakdown
  const modelEntries = Object.entries(computedCosts.byModel);
  const tiers = ['opus', 'sonnet', 'haiku'] as const;

  for (const tier of tiers) {
    const tierEntries = modelEntries.filter(([, v]) => v.tier === tier);
    if (tierEntries.length === 0) continue;

    const p = modelPricing[tier];
    if (!p) continue;

    const tierCost = tierEntries.reduce((s, [, v]) => s + v.cost, 0);
    // Only count period cost: current period tokens from the corresponding tier
    const periodCostForTier = (() => {
      // Approximation: scale tier cost by period/total ratio
      const ratio =
        computedCosts.totalApiCost > 0
          ? computedCosts.currentPeriodCost / computedCosts.totalApiCost
          : 0;
      return tierCost * ratio;
    })();

    rows.push({
      label: p.displayName,
      value: formatCost(periodCostForTier),
      highlight: 'amber',
    });

    const tok = computedCosts.currentPeriodTokens;

    rows.push({
      label: `Input: ${formatTokens(tok.inputTokens)} × $${p.input}/MTok`,
      value: formatCost((tok.inputTokens / 1_000_000) * p.input),
      indent: true,
    });
    rows.push({
      label: `Output: ${formatTokens(tok.outputTokens)} × $${p.output}/MTok`,
      value: formatCost((tok.outputTokens / 1_000_000) * p.output),
      indent: true,
    });
    rows.push({
      label: `Cache writes: ${formatTokens(tok.cacheCreationInputTokens)} × $${p.cacheCreation}/MTok`,
      value: formatCost((tok.cacheCreationInputTokens / 1_000_000) * p.cacheCreation),
      indent: true,
    });
    rows.push({
      label: `Cache reads: ${formatTokens(tok.cacheReadInputTokens)} × $${p.cacheRead}/MTok`,
      value: formatCost((tok.cacheReadInputTokens / 1_000_000) * p.cacheRead),
      indent: true,
    });
  }

  rows.push({ separator: true } as DrilldownRow);
  rows.push({
    label: 'Total This-Period API Equivalent',
    value: formatCost(computedCosts.currentPeriodCost),
    highlight: 'amber',
  });
  rows.push({ separator: true } as DrilldownRow);
  rows.push({
    label: 'Your subscription cost',
    value: formatCost(subscriptionCost),
    highlight: 'blue',
  });

  const subscriberValue = computedCosts.currentPeriodCost - subscriptionCost;
  rows.push({
    label: subscriberValue >= 0 ? 'Net savings (vs API)' : 'You over-paid vs usage',
    value: `${subscriberValue >= 0 ? '+' : ''}${formatCost(subscriberValue)}`,
    highlight: subscriberValue >= 0 ? 'green' : 'red',
    sub: subscriberValue >= 0 ? 'Subscription is paying off' : 'API would have been cheaper this period',
  });

  return (
    <DrilldownModal
      title="This Period API Cost"
      subtitle={`Billing period starting ${periodLabel}`}
      rows={rows}
      note={
        <>
          Rates are sourced from{' '}
          <a
            href="https://www.anthropic.com/pricing"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-slate-400"
          >
            anthropic.com/pricing
          </a>
          . Token counts are read directly from your{' '}
          <code>~/.claude/projects</code> JSONL files. Mixed-model sessions
          use each model's own rate per message.
        </>
      }
      onClose={onClose}
    />
  );
}

/** Builds the breakdown for "All-Time API Equiv." */
export function AllTimeApiDrilldown({
  computedCosts,
  modelPricing,
  firstSessionDate,
  onClose,
}: {
  computedCosts: ComputedCosts;
  modelPricing: Record<string, ModelPricing>;
  firstSessionDate: string | null;
  onClose: () => void;
}) {
  const sinceLabel = firstSessionDate
    ? new Date(firstSessionDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'first recorded session';

  const rows: DrilldownRow[] = [];
  const tiers = ['opus', 'sonnet', 'haiku'] as const;
  const modelEntries = Object.entries(computedCosts.byModel);

  for (const tier of tiers) {
    const tierEntries = modelEntries.filter(([, v]) => v.tier === tier);
    if (tierEntries.length === 0) continue;

    const p = modelPricing[tier];
    if (!p) continue;

    const allTok = tierEntries.reduce(
      (acc, [, v]) => ({
        input: acc.input + v.tokens.inputTokens,
        output: acc.output + v.tokens.outputTokens,
        cacheWrite: acc.cacheWrite + v.tokens.cacheCreationInputTokens,
        cacheRead: acc.cacheRead + v.tokens.cacheReadInputTokens,
      }),
      { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 }
    );

    const tierCost = tierEntries.reduce((s, [, v]) => s + v.cost, 0);

    rows.push({
      label: p.displayName,
      value: formatCost(tierCost),
      highlight: 'amber',
    });
    rows.push({
      label: `Input: ${formatTokens(allTok.input)} × $${p.input}/MTok`,
      value: formatCost((allTok.input / 1_000_000) * p.input),
      indent: true,
    });
    rows.push({
      label: `Output: ${formatTokens(allTok.output)} × $${p.output}/MTok`,
      value: formatCost((allTok.output / 1_000_000) * p.output),
      indent: true,
    });
    rows.push({
      label: `Cache writes: ${formatTokens(allTok.cacheWrite)} × $${p.cacheCreation}/MTok`,
      value: formatCost((allTok.cacheWrite / 1_000_000) * p.cacheCreation),
      indent: true,
    });
    rows.push({
      label: `Cache reads: ${formatTokens(allTok.cacheRead)} × $${p.cacheRead}/MTok`,
      value: formatCost((allTok.cacheRead / 1_000_000) * p.cacheRead),
      indent: true,
    });
  }

  rows.push({ separator: true } as DrilldownRow);
  rows.push({
    label: 'All-Time Total (API equivalent)',
    value: formatCost(computedCosts.totalApiCost),
    highlight: 'amber',
    sub: `Since ${sinceLabel}`,
  });

  return (
    <DrilldownModal
      title="All-Time API Equivalent"
      subtitle={`Since ${sinceLabel}`}
      rows={rows}
      note={
        <>
          All-time totals come from{' '}
          <code>~/.claude/stats-cache.json</code> (written by Claude Code).
          Per-token rates are the current published API list price from{' '}
          <a
            href="https://www.anthropic.com/pricing"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-slate-400"
          >
            anthropic.com/pricing
          </a>
          . The actual cost to Anthropic to serve you is lower than API list
          price due to infrastructure efficiencies.
        </>
      }
      onClose={onClose}
    />
  );
}

/** Builds the breakdown for "Net Value (Period)" */
export function NetValueDrilldown({
  subscriptionCost,
  currentPeriodCost,
  periodStart,
  onClose,
}: {
  subscriptionCost: number;
  currentPeriodCost: number;
  periodStart: string;
  onClose: () => void;
}) {
  const periodLabel = new Date(periodStart).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const subscriberNet = currentPeriodCost - subscriptionCost;
  const subscriberWins = subscriberNet >= 0;

  const rows: DrilldownRow[] = [
    {
      label: 'API-equivalent cost this period',
      value: formatCost(currentPeriodCost),
      sub: 'What you would have paid at API rates',
      highlight: 'amber',
    },
    {
      label: 'Your subscription cost this period',
      value: `−${formatCost(subscriptionCost)}`,
      sub: 'Flat monthly rate you pay to Anthropic',
      highlight: 'blue',
    },
    { separator: true } as DrilldownRow,
    {
      label: 'Net Value (API cost − Subscription)',
      value: `${subscriberNet >= 0 ? '+' : ''}${formatCost(subscriberNet)}`,
      highlight: subscriberWins ? 'green' : 'red',
      sub: subscriberWins
        ? '✓ Subscription is worth it — you consumed more than you paid for'
        : '✗ API would have been cheaper this period',
    },
  ];

  return (
    <DrilldownModal
      title="Net Value (Period)"
      subtitle={`Billing period starting ${periodLabel}`}
      rows={rows}
      note={
        <>
          <strong className="text-slate-400">Positive</strong> = subscription is paying off: the
          compute you consumed at API rates is <em>greater</em> than your flat subscription
          fee. <strong className="text-slate-400">Negative</strong> = you would have spent
          less if you used the pay-per-token API directly this period. This does not
          account for model availability differences or rate limits.
        </>
      }
      onClose={onClose}
    />
  );
}
