import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { TickEntry } from '../types';
import { formatCost, formatTokens } from '../utils/pricing';

interface Props {
  ticks: TickEntry[];
  intervalMs: number;
  onClear: () => void;
}

const PAGE_SIZE = 10;

function formatInterval(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (rem === 0) return `${m}m`;
  return `${m}m ${rem}s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TickHistory({ ticks, intervalMs, onClear }: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(ticks.length / PAGE_SIZE));

  // Clamp page if entries were cleared
  const safePage = Math.min(page, totalPages - 1);

  const pageEntries = useMemo(
    () => ticks.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [ticks, safePage]
  );

  // Aggregate stats
  const totalDeltaCost = useMemo(
    () => ticks.reduce((sum, t) => sum + t.deltaCost, 0),
    [ticks]
  );
  const totalDeltaTokens = useMemo(
    () => ticks.reduce((sum, t) => sum + t.deltaTokens, 0),
    [ticks]
  );
  const avgPerTick = ticks.length > 0 ? totalDeltaCost / ticks.length : 0;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-orange-400" />
            <h3 className="text-sm font-semibold text-white">Tick History</h3>
            <span className="rounded-full border border-slate-600/60 bg-slate-700/40 px-2 py-0.5 text-xs text-slate-400">
              every {formatInterval(intervalMs)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            One entry per refresh interval where new tokens were consumed.
            Use it to see how much you're spending per tick.
          </p>
        </div>

        {ticks.length > 0 && (
          <button
            onClick={() => {
              onClear();
              setPage(0);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-all"
          >
            <Trash2 size={11} /> Clear history
          </button>
        )}
      </div>

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {ticks.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700/60 bg-slate-900/40 p-8 text-center">
          <Clock size={28} className="mx-auto mb-3 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">
            No ticks recorded yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Ticks are recorded every {formatInterval(intervalMs)} whenever new
            tokens are consumed. Send a Claude Code message to populate this
            table.
          </p>
        </div>
      )}

      {/* ── Aggregate strip ────────────────────────────────────────────────── */}
      {ticks.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-700/30 p-3">
            <p className="text-xs text-slate-500">Total ticks</p>
            <p className="mt-0.5 text-base font-bold text-white">
              {ticks.length}
            </p>
          </div>
          <div className="rounded-xl bg-slate-700/30 p-3">
            <p className="text-xs text-slate-500">Spent across ticks</p>
            <p className="mt-0.5 text-base font-bold text-amber-300">
              {formatCost(totalDeltaCost)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-700/30 p-3">
            <p className="text-xs text-slate-500">Avg / tick</p>
            <p className="mt-0.5 text-base font-bold text-blue-300">
              {formatCost(avgPerTick)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-700/30 p-3">
            <p className="text-xs text-slate-500">Tokens recorded</p>
            <p className="mt-0.5 text-base font-bold text-violet-300">
              {formatTokens(totalDeltaTokens)}
            </p>
          </div>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {ticks.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-700/60">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-800/60 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 text-right font-medium">Δ Tokens</th>
                <th className="px-3 py-2 text-right font-medium">Δ Cost</th>
                <th className="px-3 py-2 text-right font-medium">All-Time Total</th>
                <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                  Period Total
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {pageEntries.map((tick, i) => {
                const globalIndex = safePage * PAGE_SIZE + i + 1;
                return (
                  <tr
                    key={tick.id}
                    className="border-b border-slate-700/40 hover:bg-slate-800/40 transition-colors last:border-0"
                  >
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {globalIndex}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-300">
                          {formatTime(tick.timestamp)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(tick.timestamp)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-mono text-violet-300">
                      +{formatTokens(tick.deltaTokens)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-300">
                        <TrendingUp size={10} />+{formatCost(tick.deltaCost)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-mono text-slate-400">
                      {formatCost(tick.totalApiCost)}
                    </td>
                    <td className="hidden px-3 py-2 text-right text-xs font-mono text-slate-400 sm:table-cell">
                      {formatCost(tick.currentPeriodCost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {ticks.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing{' '}
            <span className="text-slate-300">
              {safePage * PAGE_SIZE + 1}–
              {Math.min((safePage + 1) * PAGE_SIZE, ticks.length)}
            </span>{' '}
            of <span className="text-slate-300">{ticks.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={12} /> Prev
            </button>
            <span className="text-xs text-slate-500">
              Page <span className="text-slate-300">{safePage + 1}</span> /{' '}
              {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
