import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';
import { Session } from '../types';
import { formatCost, formatTokens } from '../utils/pricing';

interface Props {
  sessions: Session[];
  subscriptionCost: number;
}

function getModelBadge(models: Record<string, any>): string {
  const tiers = Object.keys(models).map((m) => {
    const id = m.toLowerCase();
    if (id.includes('opus')) return 'Opus';
    if (id.includes('haiku')) return 'Haiku';
    return 'Sonnet';
  });
  const seen = new Set<string>();
  const unique = tiers.filter((t) => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
  return unique.join(' + ');
}

function cacheHitRate(tokens: Session['totalTokens']): number {
  const total =
    tokens.inputTokens +
    tokens.outputTokens +
    tokens.cacheReadInputTokens +
    tokens.cacheCreationInputTokens;
  if (total === 0) return 0;
  return (tokens.cacheReadInputTokens / total) * 100;
}

/** What % of the monthly subscription did this session consume in API cost? */
function subPct(sessionCost: number, subscriptionCost: number): number {
  if (subscriptionCost === 0) return 0;
  return (sessionCost / subscriptionCost) * 100;
}

function pctColor(pct: number): string {
  if (pct < 5) return 'text-emerald-400';
  if (pct < 15) return 'text-amber-400';
  return 'text-red-400';
}

function pctBarColor(pct: number): string {
  if (pct < 5) return 'bg-emerald-500';
  if (pct < 15) return 'bg-amber-500';
  return 'bg-red-500';
}

export function SessionsTable({ sessions, subscriptionCost }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'cost' | 'tokens' | 'subpct'>(
    'date'
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const mainSessions = sessions.filter((s) => !s.isSubagent);

  // Compute per-session metrics
  const enriched = mainSessions.map((s) => {
    const pct = subPct(s.estimatedCost, subscriptionCost);
    const anthropicNet = subscriptionCost / mainSessions.length - s.estimatedCost;
    return { ...s, subPct: pct, anthropicNet };
  });

  const sorted = [...enriched].sort((a, b) => {
    let av = 0,
      bv = 0;
    if (sortBy === 'date') {
      av = new Date(a.lastActivity || 0).getTime();
      bv = new Date(b.lastActivity || 0).getTime();
    } else if (sortBy === 'cost') {
      av = a.estimatedCost;
      bv = b.estimatedCost;
    } else if (sortBy === 'subpct') {
      av = a.subPct;
      bv = b.subPct;
    } else {
      av =
        a.totalTokens.inputTokens +
        a.totalTokens.outputTokens +
        a.totalTokens.cacheReadInputTokens +
        a.totalTokens.cacheCreationInputTokens;
      bv =
        b.totalTokens.inputTokens +
        b.totalTokens.outputTokens +
        b.totalTokens.cacheReadInputTokens +
        b.totalTokens.cacheCreationInputTokens;
    }
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const displayed = expanded ? sorted : sorted.slice(0, 12);

  function handleSort(col: 'date' | 'cost' | 'tokens' | 'subpct') {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  const SortIcon = ({ col }: { col: 'date' | 'cost' | 'tokens' | 'subpct' }) =>
    sortBy === col ? (
      sortDir === 'desc' ? (
        <ChevronDown size={12} />
      ) : (
        <ChevronUp size={12} />
      )
    ) : null;

  // Period-level summary
  const totalSessionApiCost = mainSessions.reduce(
    (s, sess) => s + sess.estimatedCost,
    0
  );
  const anthropicNetAllTime = subscriptionCost - totalSessionApiCost;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-700/60">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Session P&amp;L vs Subscription
          </h3>
          <p className="text-xs text-slate-500">
            {mainSessions.length} sessions · each shows its API cost vs your{' '}
            <span className="text-amber-400">{formatCost(subscriptionCost)}/mo</span>{' '}
            subscription
          </p>
        </div>
        {/* Period summary badge */}
        <div
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border ${
            anthropicNetAllTime >= 0
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {anthropicNetAllTime >= 0 ? (
            <TrendingUp size={12} />
          ) : (
            <TrendingDown size={12} />
          )}
          Anthropic{' '}
          {anthropicNetAllTime >= 0 ? 'gains' : 'loses'}{' '}
          {formatCost(Math.abs(anthropicNetAllTime))} on you this period
        </div>
      </div>

      {/* Sub cost legend */}
      <div className="flex items-center gap-4 px-5 py-2 border-b border-slate-700/30 bg-slate-900/20 text-xs">
        <span className="text-slate-500">% of {formatCost(subscriptionCost)}/mo sub consumed:</span>
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> &lt;5% — micro
        </span>
        <span className="flex items-center gap-1.5 text-amber-400">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> 5–15% — moderate
        </span>
        <span className="flex items-center gap-1.5 text-red-400">
          <span className="h-2 w-2 rounded-full bg-red-500" /> &gt;15% — heavy
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60 text-left">
              <th className="px-5 py-3 text-xs font-medium text-slate-400">
                Project
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-slate-400 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('date')}
              >
                <span className="flex items-center gap-1">
                  Date <SortIcon col="date" />
                </span>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Model
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Msgs
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-slate-400 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('tokens')}
              >
                <span className="flex items-center gap-1">
                  Tokens <SortIcon col="tokens" />
                </span>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Cache %
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-slate-400 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('cost')}
              >
                <span className="flex items-center gap-1">
                  API Cost <SortIcon col="cost" />
                </span>
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-slate-400 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('subpct')}
              >
                <span className="flex items-center gap-1">
                  % of Sub <SortIcon col="subpct" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((session, i) => {
              const total =
                session.totalTokens.inputTokens +
                session.totalTokens.outputTokens +
                session.totalTokens.cacheReadInputTokens +
                session.totalTokens.cacheCreationInputTokens;
              const cache = cacheHitRate(session.totalTokens);
              const pct = session.subPct;
              const barW = Math.min(pct, 100); // cap bar at 100% width
              const overSub = pct > 100; // this single session exceeded the whole monthly sub

              return (
                <tr
                  key={session.sessionId}
                  className={`border-b border-slate-700/30 transition-colors hover:bg-slate-700/20 ${
                    i % 2 === 0 ? '' : 'bg-slate-800/30'
                  }`}
                >
                  {/* Project */}
                  <td className="px-5 py-3">
                    <span
                      className="block max-w-[160px] truncate text-xs font-medium text-slate-200"
                      title={session.project}
                    >
                      {session.project}
                    </span>
                    <span className="block text-xs text-slate-500 font-mono truncate max-w-[160px]">
                      {session.sessionId.slice(0, 8)}…
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {session.lastActivity
                      ? new Date(session.lastActivity).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric', year: '2-digit' }
                        )
                      : '—'}
                  </td>

                  {/* Model */}
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-300">
                      {getModelBadge(session.models)}
                    </span>
                  </td>

                  {/* Messages */}
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {session.messageCount}
                  </td>

                  {/* Tokens */}
                  <td className="px-4 py-3 text-xs font-medium text-white">
                    {formatTokens(total)}
                  </td>

                  {/* Cache hit rate */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${cache}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        {cache.toFixed(0)}%
                      </span>
                    </div>
                  </td>

                  {/* API Cost */}
                  <td className="px-4 py-3 text-xs font-semibold text-amber-400 whitespace-nowrap">
                    {formatCost(session.estimatedCost)}
                  </td>

                  {/* % of subscription */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 min-w-[90px]">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${pctColor(pct)}`}>
                          {pct >= 100
                            ? `${pct.toFixed(0)}%`
                            : pct >= 1
                            ? `${pct.toFixed(1)}%`
                            : `${pct.toFixed(2)}%`}
                        </span>
                        {overSub && (
                          <span className="text-xs text-red-400 font-bold ml-1">
                            !!!
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                        <div
                          className={`h-full rounded-full ${pctBarColor(pct)} transition-all`}
                          style={{ width: `${Math.min(barW, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: show more / totals */}
      <div className="border-t border-slate-700/60 px-5 py-3 flex items-center justify-between">
        {/* Totals */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-500">
            Total API cost:{' '}
            <span className="font-semibold text-amber-400">
              {formatCost(totalSessionApiCost)}
            </span>
          </span>
          <span className="text-slate-500">
            vs sub:{' '}
            <span className="font-semibold text-slate-300">
              {formatCost(subscriptionCost)}
            </span>
          </span>
          <span
            className={`font-semibold ${
              anthropicNetAllTime >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            Anthropic net:{' '}
            {anthropicNetAllTime >= 0 ? '+' : '−'}
            {formatCost(Math.abs(anthropicNetAllTime))}
          </span>
        </div>

        {mainSessions.length > 12 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp size={14} /> Show less
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Show all {mainSessions.length} sessions
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
