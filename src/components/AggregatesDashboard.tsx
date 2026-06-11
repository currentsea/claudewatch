import React, { useEffect, useMemo, useState } from 'react';
import {
  Database,
  Loader2,
  AlertCircle,
  Folder,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { AggregatesPayload, AggregateRow } from '../types';
import { formatCost, formatTokens, formatMonthLabel } from '../utils/pricing';

interface Props {
  subscriptionCost: number;
}

type GroupMode = 'project' | 'month' | 'tier';

const TIER_COLORS: Record<string, string> = {
  fable: 'text-amber-400',
  opus: 'text-purple-400',
  sonnet: 'text-indigo-400',
  haiku: 'text-cyan-400',
  unknown: 'text-slate-400',
};

const TIER_BG: Record<string, string> = {
  fable: 'bg-amber-500',
  opus: 'bg-purple-500',
  sonnet: 'bg-indigo-500',
  haiku: 'bg-cyan-500',
  unknown: 'bg-slate-500',
};

function rowTokens(r: AggregateRow): number {
  return (
    (r.inputTokens || 0) +
    (r.outputTokens || 0) +
    (r.cacheReadInputTokens || 0) +
    (r.cacheCreationInputTokens || 0)
  );
}

type Grouped = Array<[string, AggregateRow[]]>;

function groupRows(rows: AggregateRow[], mode: GroupMode): Grouped {
  const map = new Map<string, AggregateRow[]>();
  for (const r of rows) {
    const key =
      mode === 'project' ? r.project : mode === 'month' ? r.month : r.tier;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  const entries: Grouped = Array.from(map.entries());
  entries.sort((a, b) => {
    const ac = a[1].reduce((s: number, r: AggregateRow) => s + r.apiCost, 0);
    const bc = b[1].reduce((s: number, r: AggregateRow) => s + r.apiCost, 0);
    return bc - ac;
  });
  return entries;
}

export function AggregatesDashboard({ subscriptionCost }: Props) {
  const [payload, setPayload] = useState<AggregatesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<GroupMode>('project');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showExplainer, setShowExplainer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/aggregates')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setPayload(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Failed to load aggregates');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(
    () => (payload ? groupRows(payload.rows, mode) : []),
    [payload, mode]
  );

  const maxGroupCost = useMemo(() => {
    let max = 0;
    for (const [, group] of grouped) {
      const total = group.reduce((s: number, r: AggregateRow) => s + r.apiCost, 0);
      if (total > max) max = total;
    }
    return max;
  }, [grouped]);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
            <Database size={12} className="text-emerald-400" />
            Aggregates
          </div>
          <h1 className="text-2xl font-bold text-white">
            Project × Month × Model Rollups
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Backed by a local SQLite store and historical pricing — usage from
            previous months is costed at the rate that was active at the time.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/50 p-1">
          {(['project', 'month', 'tier'] as GroupMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                mode === m
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              data-testid={`agg-group-${m}`}
            >
              Group by {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── Explainer ─────────────────────────────────────────────────────── */}
      <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0 text-emerald-400/70" />
          <div className="flex-1 text-xs text-emerald-100/70 leading-relaxed">
            <p>
              <strong className="text-emerald-300/90">Read it like a sixth-grader:</strong>{' '}
              Every Claude conversation you've ever had is broken into "project,
              month, model" slices and stacked here. Each slice shows{' '}
              <em>what Anthropic would have charged you at API rates that
              month</em>. If you used 10× more Opus in May than April, the May
              row will be 10× larger. Click a row to see its component models.
            </p>
            <button
              onClick={() => setShowExplainer((v) => !v)}
              className="mt-1 text-emerald-200 underline-offset-2 hover:underline"
            >
              {showExplainer ? 'hide' : 'show'} how the math works
            </button>
            {showExplainer && (
              <div className="mt-2 rounded-lg border border-emerald-500/20 bg-black/20 p-2 text-[11px] leading-relaxed">
                <ol className="ml-4 list-decimal space-y-1">
                  <li>
                    For each session in your{' '}
                    <code className="rounded bg-slate-800/60 px-1">
                      ~/.claude/projects
                    </code>{' '}
                    folder, we read its tokens-by-model.
                  </li>
                  <li>
                    We figure out <em>which month and day</em> the session
                    happened.
                  </li>
                  <li>
                    We look up the API rates that were in effect on that day in
                    the price-history table.
                  </li>
                  <li>
                    We multiply (tokens ÷ 1,000,000) × (rate per million) and
                    add them up.
                  </li>
                  <li>
                    The result is the project's "API equivalent cost" for that
                    month.
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-700/60 bg-black/10 py-16 text-slate-500">
          <Loader2 size={20} className="mr-2 animate-spin" />
          Loading aggregates…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {payload && !loading && payload.rows.length === 0 && (
        <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-8 text-center text-sm text-slate-400">
          <p className="font-semibold text-slate-300">No aggregates yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Visit the Dashboard tab once to populate the SQLite store from your
            session files.
          </p>
        </div>
      )}

      {payload && !loading && payload.rows.length > 0 && (
        <>
          {/* Totals strip */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-700/60 bg-black/10 p-3">
              <p className="text-xs text-slate-500">Sessions</p>
              <p className="text-lg font-bold text-white">
                {payload.totals.sessions.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-black/10 p-3">
              <p className="text-xs text-slate-500">Messages</p>
              <p className="text-lg font-bold text-white">
                {payload.totals.messages.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-black/10 p-3">
              <p className="text-xs text-slate-500">Tokens (all-time)</p>
              <p className="text-lg font-bold text-violet-300">
                {formatTokens(payload.totals.tokens)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-black/10 p-3">
              <p className="text-xs text-slate-500">API equiv. (historical)</p>
              <p className="text-lg font-bold text-amber-300">
                {formatCost(payload.totals.apiCost)}
              </p>
            </div>
          </div>

          {/* Grouped table */}
          <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-black/10">
            <div className="border-b border-slate-700/60 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Grouped by {mode}
            </div>

            <ul className="divide-y divide-slate-700/40">
              {grouped.map(([key, group]) => {
                const isOpen = expanded.has(key);
                const groupCost = group.reduce((s: number, r: AggregateRow) => s + r.apiCost, 0);
                const groupTokens = group.reduce((s: number, r: AggregateRow) => s + rowTokens(r), 0);
                const groupSessions = group.reduce((s: number, r: AggregateRow) => s + r.sessions, 0);
                const widthPct = maxGroupCost > 0 ? (groupCost / maxGroupCost) * 100 : 0;
                const label =
                  mode === 'month' ? formatMonthLabel(key) : key;

                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-700/20"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {mode === 'project' && (
                          <Folder size={14} className="shrink-0 text-slate-500" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {label}
                          </p>
                          <p className="text-xs text-slate-500">
                            {groupSessions} session{groupSessions !== 1 ? 's' : ''}
                            {' · '}
                            {formatTokens(groupTokens)} tokens
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-slate-700 sm:block">
                          <div
                            className="h-full rounded-full bg-amber-500/80"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <p className="font-mono text-sm font-semibold text-amber-300">
                          {formatCost(groupCost)}
                        </p>
                        {isOpen ? (
                          <ChevronUp size={14} className="text-slate-500" />
                        ) : (
                          <ChevronDown size={14} className="text-slate-500" />
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-700/40 bg-black/20 px-5 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-slate-500">
                              {mode !== 'project' && <th className="pb-2">Project</th>}
                              {mode !== 'month' && <th className="pb-2">Month</th>}
                              {mode !== 'tier' && <th className="pb-2">Tier</th>}
                              <th className="pb-2 text-right">Sessions</th>
                              <th className="pb-2 text-right">Tokens</th>
                              <th className="pb-2 text-right">API cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group
                              .slice()
                              .sort((a: AggregateRow, b: AggregateRow) => b.apiCost - a.apiCost)
                              .map((r: AggregateRow, i: number) => (
                                <tr
                                  key={`${r.project}-${r.month}-${r.tier}-${i}`}
                                  className="border-t border-slate-700/30 align-top"
                                >
                                  {mode !== 'project' && (
                                    <td className="py-1.5 pr-3 text-slate-300">
                                      {r.project}
                                    </td>
                                  )}
                                  {mode !== 'month' && (
                                    <td className="py-1.5 pr-3 font-mono text-slate-300">
                                      {formatMonthLabel(r.month)}
                                    </td>
                                  )}
                                  {mode !== 'tier' && (
                                    <td className="py-1.5 pr-3">
                                      <span
                                        className={`inline-flex items-center gap-1.5 ${
                                          TIER_COLORS[r.tier] || ''
                                        }`}
                                      >
                                        <span
                                          className={`h-1.5 w-1.5 rounded-full ${
                                            TIER_BG[r.tier] || 'bg-slate-500'
                                          }`}
                                        />
                                        {r.tier}
                                      </span>
                                    </td>
                                  )}
                                  <td className="py-1.5 pr-3 text-right text-slate-400">
                                    {r.sessions}
                                  </td>
                                  <td className="py-1.5 pr-3 text-right text-violet-300">
                                    {formatTokens(rowTokens(r))}
                                  </td>
                                  <td className="py-1.5 text-right font-mono text-amber-300">
                                    {formatCost(r.apiCost)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mt-4 text-xs text-slate-600">
            Subscription baseline:{' '}
            <span className="text-slate-400">{formatCost(subscriptionCost)} / mo</span>.
            Rows above subscription on any single month indicate API would have
            cost more than the flat fee for that month.
          </p>
        </>
      )}
    </main>
  );
}
