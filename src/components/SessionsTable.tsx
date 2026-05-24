import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Session } from '../types';
import { formatCost, formatTokens } from '../utils/pricing';

interface Props {
  sessions: Session[];
}

function getModelBadge(models: Record<string, any>): string {
  const tiers = Object.keys(models).map((m) => {
    const id = m.toLowerCase();
    if (id.includes('opus')) return 'Opus';
    if (id.includes('haiku')) return 'Haiku';
    return 'Sonnet';
  });
  const seen = new Set<string>();
  const unique = tiers.filter((t) => { if (seen.has(t)) return false; seen.add(t); return true; });
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

export function SessionsTable({ sessions }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'cost' | 'tokens'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const mainSessions = sessions.filter((s) => !s.isSubagent);

  const sorted = [...mainSessions].sort((a, b) => {
    let av = 0,
      bv = 0;
    if (sortBy === 'date') {
      av = new Date(a.lastActivity || 0).getTime();
      bv = new Date(b.lastActivity || 0).getTime();
    } else if (sortBy === 'cost') {
      av = a.estimatedCost;
      bv = b.estimatedCost;
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

  const displayed = expanded ? sorted : sorted.slice(0, 10);

  function handleSort(col: 'date' | 'cost' | 'tokens') {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  const SortIcon = ({ col }: { col: 'date' | 'cost' | 'tokens' }) =>
    sortBy === col ? (
      sortDir === 'desc' ? (
        <ChevronDown size={12} />
      ) : (
        <ChevronUp size={12} />
      )
    ) : null;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
        <div>
          <h3 className="text-sm font-semibold text-white">Recent Sessions</h3>
          <p className="text-xs text-slate-500">
            {mainSessions.length} sessions tracked
          </p>
        </div>
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

              return (
                <tr
                  key={session.sessionId}
                  className={`border-b border-slate-700/30 transition-colors hover:bg-slate-700/20 ${
                    i % 2 === 0 ? '' : 'bg-slate-800/30'
                  }`}
                >
                  <td className="px-5 py-3">
                    <span
                      className="block max-w-[180px] truncate text-xs font-medium text-slate-200"
                      title={session.project}
                    >
                      {session.project}
                    </span>
                    <span className="block text-xs text-slate-500 font-mono truncate max-w-[180px]">
                      {session.sessionId.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {session.lastActivity
                      ? new Date(session.lastActivity).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric', year: '2-digit' }
                        )
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-300">
                      {getModelBadge(session.models)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {session.messageCount}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-white">
                    {formatTokens(total)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-700">
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
                  <td className="px-4 py-3 text-xs font-semibold text-amber-400">
                    {formatCost(session.estimatedCost)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {mainSessions.length > 10 && (
        <div className="border-t border-slate-700/60 px-5 py-3">
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
        </div>
      )}
    </div>
  );
}
