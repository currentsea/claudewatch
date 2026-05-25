import React from 'react';
import { Activity, Clock, Hourglass } from 'lucide-react';
import { ActiveSession } from '../types';
import { formatCost, formatTokens } from '../utils/pricing';

interface Props {
  activeSessions: ActiveSession[];
  onSelectSession?: (sessionId: string) => void;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'expired';
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}m left`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m left`;
}

function formatAgo(min: number): string {
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m ago`;
}

export function ActiveSessionsPanel({
  activeSessions,
  onSelectSession,
}: Props) {
  const totalActiveCost = activeSessions.reduce(
    (s, x) => s + x.estimatedCost,
    0
  );

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              Active usage windows
            </h3>
            {activeSessions.length > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Sessions touched in the last 5h (Claude's rolling usage window).
            See{' '}
            <a
              href="https://claude.ai/settings/usage"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-300"
            >
              claude.ai/settings/usage
            </a>{' '}
            for the authoritative remainder.
          </p>
        </div>
        {activeSessions.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Cost incurred (open)</p>
            <p className="text-sm font-bold text-amber-300">
              {formatCost(totalActiveCost)}
            </p>
          </div>
        )}
      </div>

      {activeSessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700/60 bg-black/20 p-6 text-center">
          <Clock size={24} className="mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">
            No open windows right now
          </p>
          <p className="mt-1 text-xs text-slate-500">
            A new Claude Code session will appear here within the refresh
            interval.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {activeSessions.map((s) => {
            const tot =
              s.totalTokens.inputTokens +
              s.totalTokens.outputTokens +
              s.totalTokens.cacheReadInputTokens +
              s.totalTokens.cacheCreationInputTokens;
            const windowFullMs = s.windowHours * 60 * 60 * 1000;
            const elapsedPct = Math.min(
              100,
              (s.windowElapsedMs / windowFullMs) * 100
            );

            return (
              <li
                key={s.sessionId}
                className="group rounded-xl border border-slate-700/40 bg-black/20 p-3 transition-colors hover:border-slate-600/60 hover:bg-black/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onSelectSession?.(s.sessionId)}
                      className="block max-w-full truncate text-left text-sm font-medium text-slate-200 hover:text-white"
                      title={s.project}
                    >
                      {s.project}
                    </button>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="font-mono">
                        {s.sessionId.slice(0, 8)}…
                      </span>{' '}
                      · {s.messageCount} msgs · {formatTokens(tot)} tokens
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-300">
                      {formatCost(s.estimatedCost)}
                    </p>
                    <p className="text-xs text-slate-500">
                      last {formatAgo(s.minutesSinceLastActivity)}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Hourglass size={10} className="text-amber-400" />
                      Window {Math.floor(elapsedPct)}% elapsed
                    </span>
                    <span
                      className={
                        s.windowRemainingMs > 30 * 60 * 1000
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }
                    >
                      {formatRemaining(s.windowRemainingMs)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/60">
                    <div
                      className={`h-full rounded-full transition-all ${
                        elapsedPct < 60
                          ? 'bg-emerald-500'
                          : elapsedPct < 85
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${elapsedPct}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
