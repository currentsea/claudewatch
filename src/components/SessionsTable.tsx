import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Session } from '../types';
import { formatCost, formatTokens } from '../utils/pricing';

interface Props {
  sessions: Session[];
  subscriptionCost: number;
  onSelectSession?: (sessionId: string) => void;
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

/** Token share of this session as a fraction (0–1) of all session tokens combined. */
function tokenShare(sessionTokens: number, totalTokens: number): number {
  if (totalTokens === 0) return 0;
  return sessionTokens / totalTokens;
}

function shareColor(pct: number): string {
  if (pct < 5) return 'text-emerald-400';
  if (pct < 15) return 'text-amber-400';
  return 'text-red-400';
}

function shareBarColor(pct: number): string {
  if (pct < 5) return 'bg-emerald-500';
  if (pct < 15) return 'bg-amber-500';
  return 'bg-red-500';
}

export function SessionsTable({ sessions, subscriptionCost, onSelectSession }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'cost' | 'tokens' | 'subcost'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showLegend, setShowLegend] = useState(false);

  const mainSessions = sessions.filter((s) => !s.isSubagent);

  // Total tokens across all sessions (for proportional subscription allocation)
  const totalAllTokens = mainSessions.reduce((sum, s) => {
    return (
      sum +
      s.totalTokens.inputTokens +
      s.totalTokens.outputTokens +
      s.totalTokens.cacheReadInputTokens +
      s.totalTokens.cacheCreationInputTokens
    );
  }, 0);

  // Total API cost across all sessions (for subscription-cost weighting)
  const totalSessionApiCost = mainSessions.reduce((s, sess) => s + sess.estimatedCost, 0);

  // Compute per-session metrics
  const enriched = mainSessions.map((s) => {
    const sessionTok =
      s.totalTokens.inputTokens +
      s.totalTokens.outputTokens +
      s.totalTokens.cacheReadInputTokens +
      s.totalTokens.cacheCreationInputTokens;
    const share = tokenShare(sessionTok, totalAllTokens);
    const sharePct = share * 100;

    // "Your cost" — the slice of your subscription fee attributable to this session,
    // proportional to its token share.
    // e.g. if this session is 10% of all tokens, you "spent" 10% of your monthly fee here.
    const yourCostForSession = share * subscriptionCost;

    // Anthropic's estimated spend to serve this session (API list price ≈ upper bound)
    const anthropicCostForSession = s.estimatedCost;

    // Net from Anthropic's perspective: your subscription slice − their compute cost
    const anthropicNet = yourCostForSession - anthropicCostForSession;

    return {
      ...s,
      subPct: sharePct,
      yourCostForSession,
      anthropicCostForSession,
      anthropicNet,
    };
  });

  const sorted = [...enriched].sort((a, b) => {
    let av = 0, bv = 0;
    if (sortBy === 'date') {
      av = new Date(a.lastActivity || 0).getTime();
      bv = new Date(b.lastActivity || 0).getTime();
    } else if (sortBy === 'cost') {
      av = a.estimatedCost;
      bv = b.estimatedCost;
    } else if (sortBy === 'subcost') {
      av = a.yourCostForSession;
      bv = b.yourCostForSession;
    } else {
      av = a.totalTokens.inputTokens + a.totalTokens.outputTokens +
           a.totalTokens.cacheReadInputTokens + a.totalTokens.cacheCreationInputTokens;
      bv = b.totalTokens.inputTokens + b.totalTokens.outputTokens +
           b.totalTokens.cacheReadInputTokens + b.totalTokens.cacheCreationInputTokens;
    }
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const displayed = expanded ? sorted : sorted.slice(0, 12);

  function handleSort(col: 'date' | 'cost' | 'tokens' | 'subcost') {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  const SortIcon = ({ col }: { col: 'date' | 'cost' | 'tokens' | 'subcost' }) =>
    sortBy === col ? (
      sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
    ) : null;

  // Keyboard parity for the click-to-sort headers (Enter / Space).
  const sortKeyHandler =
    (col: 'date' | 'cost' | 'tokens' | 'subcost') =>
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSort(col);
      }
    };

  const ariaSort = (col: 'date' | 'cost' | 'tokens' | 'subcost') =>
    sortBy === col ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none';

  // Whether the subscriber comes out ahead on the visible sessions
  const subscriberAheadOnVisible = totalSessionApiCost >= subscriptionCost;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-black/10 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-700/60">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Session P&amp;L vs Subscription
          </h3>
          <p className="text-xs text-slate-500">
            {mainSessions.length} sessions · comparing your subscriber cost to Anthropic's
            estimated compute expense per session
          </p>
        </div>
        {/* Visible-sessions summary badge — uses subscriber framing only */}
        <div
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border ${
            subscriberAheadOnVisible
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}
        >
          {subscriberAheadOnVisible ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {subscriberAheadOnVisible
            ? `Subscription ahead by ${formatCost(totalSessionApiCost - subscriptionCost)}`
            : `Sub would save ${formatCost(subscriptionCost - totalSessionApiCost)} less than API`}
        </div>
      </div>

      {/* Cost column legend */}
      <div className="border-b border-slate-700/30 bg-slate-900/20 px-5 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="font-medium text-slate-400">Column key:</span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            API cost = Anthropic's approx. compute expense (list price)
          </span>
          <span className="flex items-center gap-1.5 text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Your cost = your subscription fee weighted by token share
          </span>
          <button
            onClick={() => setShowLegend((v) => !v)}
            className="ml-auto flex items-center gap-1 text-slate-600 hover:text-slate-400"
          >
            <Info size={11} /> {showLegend ? 'hide' : 'details'}
          </button>
        </div>

        {showLegend && (
          <div className="mt-2 rounded-xl border border-slate-700/40 bg-black/20 p-3 text-xs text-slate-500 leading-relaxed">
            <p className="mb-1 font-semibold text-slate-300">How these two costs differ</p>
            <ul className="space-y-1">
              <li>
                <strong className="text-amber-400">API Cost (Anthropic's expense):</strong>{' '}
                What you would have paid if you used the pay-per-token API directly. This
                approximates what Anthropic spends to serve you (API list price is the closest
                public upper bound on their actual compute cost).
              </li>
              <li>
                <strong className="text-blue-400">Your Subscriber Cost:</strong>{' '}
                Your flat monthly subscription fee, divided proportionally by this session's
                share of your total token usage. If this session used 5% of your all-time
                tokens, it "cost" you 5% × your monthly fee = {formatCost(subscriptionCost * 0.05)}.
              </li>
              <li>
                The difference between these two numbers shows whether <em>this particular
                session</em> was a good use of your subscription dollar — or whether you
                would have spent less per session on pure API billing.
              </li>
            </ul>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60 text-left">
              <th className="px-5 py-3 text-xs font-medium text-slate-400">Project</th>
              <th
                className="px-4 py-3 text-xs font-medium text-slate-400 cursor-pointer hover:text-white select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50"
                onClick={() => handleSort('date')}
                onKeyDown={sortKeyHandler('date')}
                tabIndex={0}
                aria-sort={ariaSort('date')}
              >
                <span className="flex items-center gap-1">Date <SortIcon col="date" /></span>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">Model</th>
              <th className="hidden px-4 py-3 text-xs font-medium text-slate-400 md:table-cell">Msgs</th>
              <th
                className="px-4 py-3 text-xs font-medium text-slate-400 cursor-pointer hover:text-white select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50"
                onClick={() => handleSort('tokens')}
                onKeyDown={sortKeyHandler('tokens')}
                tabIndex={0}
                aria-sort={ariaSort('tokens')}
              >
                <span className="flex items-center gap-1">Tokens <SortIcon col="tokens" /></span>
              </th>
              <th className="hidden px-4 py-3 text-xs font-medium text-slate-400 md:table-cell">Cache %</th>
              <th
                className="px-4 py-3 text-xs font-medium text-amber-400 cursor-pointer hover:text-white select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50"
                onClick={() => handleSort('cost')}
                onKeyDown={sortKeyHandler('cost')}
                tabIndex={0}
                aria-sort={ariaSort('cost')}
                title="API list price — Anthropic's approx. compute expense"
              >
                <span className="flex items-center gap-1">
                  API Cost
                  <span className="text-amber-600">(Anthropic exp.)</span>
                  <SortIcon col="cost" />
                </span>
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-blue-400 cursor-pointer hover:text-white select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50"
                onClick={() => handleSort('subcost')}
                onKeyDown={sortKeyHandler('subcost')}
                tabIndex={0}
                aria-sort={ariaSort('subcost')}
                title="Your subscription cost attributed to this session"
              >
                <span className="flex items-center gap-1">
                  Your Cost
                  <span className="text-blue-600">(sub. share)</span>
                  <SortIcon col="subcost" />
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

              // Net: if API cost > your cost → this session was "worth it" for you
              const sessionValue = session.anthropicCostForSession - session.yourCostForSession;

              return (
                <tr
                  key={session.sessionId}
                  onClick={() => onSelectSession?.(session.sessionId)}
                  onKeyDown={
                    onSelectSession
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectSession(session.sessionId);
                          }
                        }
                      : undefined
                  }
                  role={onSelectSession ? 'button' : undefined}
                  tabIndex={onSelectSession ? 0 : undefined}
                  title={onSelectSession ? 'Click for drilldown' : undefined}
                  className={`border-b border-slate-700/30 transition-colors hover:bg-slate-700/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50 ${
                    onSelectSession ? 'cursor-pointer' : ''
                  } ${i % 2 === 0 ? '' : 'bg-black/20'}`}
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
                      ? new Date(session.lastActivity).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: '2-digit',
                        })
                      : '—'}
                  </td>

                  {/* Model */}
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-300">
                      {getModelBadge(session.models)}
                    </span>
                  </td>

                  {/* Messages */}
                  <td className="hidden px-4 py-3 text-xs text-slate-300 md:table-cell">{session.messageCount}</td>

                  {/* Tokens */}
                  <td className="px-4 py-3 text-xs font-medium text-white">
                    {formatTokens(total)}
                  </td>

                  {/* Cache hit rate */}
                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${cache}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{cache.toFixed(0)}%</span>
                    </div>
                  </td>

                  {/* API Cost (Anthropic's expense) */}
                  <td className="px-4 py-3 text-xs font-semibold text-amber-400 whitespace-nowrap">
                    {formatCost(session.estimatedCost)}
                  </td>

                  {/* Your subscriber cost */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 min-w-[90px]">
                      <span className={`text-xs font-semibold ${shareColor(pct)}`}>
                        {formatCost(session.yourCostForSession)}
                      </span>
                      {/* Mini indicator: red = you "paid" more than Anthropic spent; green = vice versa */}
                      <span
                        className={`text-[10px] ${
                          sessionValue >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {sessionValue >= 0
                          ? `↑ +${formatCost(sessionValue)} value`
                          : `↓ ${formatCost(sessionValue)} deficit`}
                      </span>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-700">
                        <div
                          className={`h-full rounded-full ${shareBarColor(pct)} transition-all`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
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
      <div className="border-t border-slate-700/60 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-slate-500">
            API cost (Anthropic):{' '}
            <span className="font-semibold text-amber-400">
              {formatCost(totalSessionApiCost)}
            </span>
          </span>
          <span className="text-slate-500">
            Your sub cost:{' '}
            <span className="font-semibold text-blue-400">
              {formatCost(subscriptionCost)}
            </span>
          </span>
          <span
            className={`font-semibold ${
              subscriberAheadOnVisible ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            Net vs sub:{' '}
            {subscriberAheadOnVisible ? '+' : '−'}
            {formatCost(Math.abs(totalSessionApiCost - subscriptionCost))}
          </span>
        </div>

        {mainSessions.length > 12 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            {expanded ? (
              <><ChevronUp size={14} /> Show less</>
            ) : (
              <><ChevronDown size={14} /> Show all {mainSessions.length} sessions</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
