import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FolderGit2,
  TrendingUp,
  TrendingDown,
  Info,
  CornerDownRight,
} from 'lucide-react';
import { Session, TokenCounts } from '../types';
import { formatCost, formatTokens } from '../utils/pricing';

interface Props {
  sessions: Session[];
  subscriptionCost: number;
  onSelectSession?: (sessionId: string) => void;
}

type SortCol = 'date' | 'cost' | 'tokens' | 'subcost';

function getModelBadge(models: Record<string, any>): string {
  const tiers = Object.keys(models).map((m) => {
    const id = m.toLowerCase();
    if (id.includes('fable') || id.includes('mythos')) return 'Fable';
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

function sumTokens(t: TokenCounts): number {
  return (
    t.inputTokens + t.outputTokens + t.cacheReadInputTokens + t.cacheCreationInputTokens
  );
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

/** Split "WebstormProjects/burnitdown" into a dim prefix + highlighted repo name. */
function splitProjectName(project: string): { prefix: string; name: string } {
  const trimmed = project.replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  if (idx === -1) return { prefix: '', name: trimmed || 'unknown' };
  return {
    prefix: trimmed.slice(0, idx + 1),
    name: trimmed.slice(idx + 1) || trimmed,
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

interface EnrichedSession extends Session {
  totalTok: number;
  cachePct: number;
  subPct: number;
  yourCostForSession: number;
  sessionValue: number;
}

interface ProjectGroup {
  project: string;
  sessions: EnrichedSession[];
  totalTok: number;
  cachePct: number;
  msgs: number;
  apiCost: number;
  yourCost: number;
  subPct: number;
  groupValue: number;
  lastActivityMs: number;
  models: Record<string, true>;
}

export function SessionsTable({ sessions, subscriptionCost, onSelectSession }: Props) {
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [sortBy, setSortBy] = useState<SortCol>('cost');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showLegend, setShowLegend] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const mainSessions = useMemo(() => sessions.filter((s) => !s.isSubagent), [sessions]);

  // Totals across every session (for proportional subscription allocation)
  const totalAllTokens = useMemo(
    () => mainSessions.reduce((sum, s) => sum + sumTokens(s.totalTokens), 0),
    [mainSessions]
  );
  const totalSessionApiCost = useMemo(
    () => mainSessions.reduce((s, sess) => s + sess.estimatedCost, 0),
    [mainSessions]
  );

  // ── Group sessions by project / repository ────────────────────────────────
  const groups = useMemo<ProjectGroup[]>(() => {
    const byProject = new Map<string, ProjectGroup>();

    for (const s of mainSessions) {
      const totalTok = sumTokens(s.totalTokens);
      const share = totalAllTokens === 0 ? 0 : totalTok / totalAllTokens;
      const yourCostForSession = share * subscriptionCost;
      const enriched: EnrichedSession = {
        ...s,
        totalTok,
        cachePct: totalTok === 0 ? 0 : (s.totalTokens.cacheReadInputTokens / totalTok) * 100,
        subPct: share * 100,
        yourCostForSession,
        sessionValue: s.estimatedCost - yourCostForSession,
      };

      const key = s.project || 'unknown';
      let g = byProject.get(key);
      if (!g) {
        g = {
          project: key,
          sessions: [],
          totalTok: 0,
          cachePct: 0,
          msgs: 0,
          apiCost: 0,
          yourCost: 0,
          subPct: 0,
          groupValue: 0,
          lastActivityMs: 0,
          models: {},
        };
        byProject.set(key, g);
      }
      g.sessions.push(enriched);
      g.totalTok += totalTok;
      g.msgs += s.messageCount;
      g.apiCost += s.estimatedCost;
      g.yourCost += yourCostForSession;
      g.subPct += enriched.subPct;
      g.lastActivityMs = Math.max(
        g.lastActivityMs,
        s.lastActivity ? new Date(s.lastActivity).getTime() : 0
      );
      Object.keys(s.models).forEach((m) => {
        g!.models[m] = true;
      });
    }

    const list = Array.from(byProject.values());
    for (const g of list) {
      const cacheRead = g.sessions.reduce(
        (sum, s) => sum + s.totalTokens.cacheReadInputTokens,
        0
      );
      g.cachePct = g.totalTok === 0 ? 0 : (cacheRead / g.totalTok) * 100;
      g.groupValue = g.apiCost - g.yourCost;
      // Newest prompt first inside each project
      g.sessions.sort(
        (a, b) =>
          new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime()
      );
    }
    return list;
  }, [mainSessions, totalAllTokens, subscriptionCost]);

  const sortedGroups = useMemo(() => {
    const arr = [...groups];
    arr.sort((a, b) => {
      let av = 0,
        bv = 0;
      if (sortBy === 'date') {
        av = a.lastActivityMs;
        bv = b.lastActivityMs;
      } else if (sortBy === 'cost') {
        av = a.apiCost;
        bv = b.apiCost;
      } else if (sortBy === 'subcost') {
        av = a.yourCost;
        bv = b.yourCost;
      } else {
        av = a.totalTok;
        bv = b.totalTok;
      }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return arr;
  }, [groups, sortBy, sortDir]);

  const displayedGroups = showAllGroups ? sortedGroups : sortedGroups.slice(0, 10);
  const allOpen = displayedGroups.length > 0 && displayedGroups.every((g) => openGroups.has(g.project));

  function toggleGroup(project: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(project)) next.delete(project);
      else next.add(project);
      return next;
    });
  }

  function toggleAll() {
    if (allOpen) setOpenGroups(new Set());
    else setOpenGroups(new Set(sortedGroups.map((g) => g.project)));
  }

  function handleSort(col: SortCol) {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  const SortIcon = ({ col }: { col: SortCol }) =>
    sortBy === col ? (
      sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
    ) : null;

  // Keyboard parity for the click-to-sort headers (Enter / Space).
  const sortKeyHandler = (col: SortCol) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(col);
    }
  };

  const ariaSort = (col: SortCol) =>
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
            {mainSessions.length} prompts across {groups.length}{' '}
            {groups.length === 1 ? 'project' : 'projects'} · expand a project to see its
            individual prompts
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
          <span className="ml-auto flex items-center gap-3">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {allOpen ? (
                <><ChevronUp size={11} /> Collapse all</>
              ) : (
                <><ChevronDown size={11} /> Expand all</>
              )}
            </button>
            <button
              onClick={() => setShowLegend((v) => !v)}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-400"
            >
              <Info size={11} /> {showLegend ? 'hide' : 'details'}
            </button>
          </span>
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
                Your flat monthly subscription fee, divided proportionally by each project's
                share of your total token usage. If a project used 5% of your all-time
                tokens, it "cost" you 5% × your monthly fee = {formatCost(subscriptionCost * 0.05)}.
              </li>
              <li>
                The difference between these two numbers shows whether a project (or any
                single prompt inside it) was a good use of your subscription dollar — or
                whether you would have spent less on pure API billing.
              </li>
            </ul>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60 text-left">
              <th className="px-5 py-3 text-xs font-medium text-slate-400">
                Project / Repository
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-slate-400 cursor-pointer hover:text-white select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50"
                onClick={() => handleSort('date')}
                onKeyDown={sortKeyHandler('date')}
                tabIndex={0}
                aria-sort={ariaSort('date')}
              >
                <span className="flex items-center gap-1">Last active <SortIcon col="date" /></span>
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
                title="Your subscription cost attributed to this project"
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
            {displayedGroups.map((group) => {
              const isOpen = openGroups.has(group.project);
              const { prefix, name } = splitProjectName(group.project);

              return (
                <React.Fragment key={group.project}>
                  {/* ── Project group row ─────────────────────────────────── */}
                  <tr
                    onClick={() => toggleGroup(group.project)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleGroup(group.project);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    title={isOpen ? 'Collapse project' : 'Expand project'}
                    className={`cursor-pointer border-b transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50 ${
                      isOpen
                        ? 'border-slate-700/60 bg-slate-800/60 hover:bg-slate-800/80'
                        : 'border-slate-700/30 hover:bg-slate-700/20'
                    }`}
                  >
                    {/* Project */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <ChevronRight
                          size={14}
                          className={`shrink-0 text-slate-500 transition-transform duration-200 ${
                            isOpen ? 'rotate-90 text-blue-400' : ''
                          }`}
                        />
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                            isOpen
                              ? 'border-blue-500/40 bg-blue-500/15 text-blue-400'
                              : 'border-slate-700/60 bg-slate-800/60 text-slate-400'
                          }`}
                        >
                          <FolderGit2 size={13} />
                        </div>
                        <div className="min-w-0">
                          <span
                            className="block max-w-[180px] truncate text-xs font-semibold text-slate-100"
                            title={group.project}
                          >
                            {prefix && <span className="font-normal text-slate-500">{prefix}</span>}
                            {name}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            {group.sessions.length}{' '}
                            {group.sessions.length === 1 ? 'prompt' : 'prompts'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Last active */}
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {group.lastActivityMs
                        ? formatDate(new Date(group.lastActivityMs).toISOString())
                        : '—'}
                    </td>

                    {/* Models */}
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-300 whitespace-nowrap">
                        {getModelBadge(group.models)}
                      </span>
                    </td>

                    {/* Messages */}
                    <td className="hidden px-4 py-3 text-xs text-slate-300 md:table-cell">
                      {group.msgs.toLocaleString()}
                    </td>

                    {/* Tokens */}
                    <td className="px-4 py-3 text-xs font-semibold text-white">
                      {formatTokens(group.totalTok)}
                    </td>

                    {/* Cache hit rate */}
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-700">
                          <div
                            className="h-full rounded-full bg-cyan-500"
                            style={{ width: `${group.cachePct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">
                          {group.cachePct.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* API Cost (Anthropic's expense) */}
                    <td className="px-4 py-3 text-xs font-bold text-amber-400 whitespace-nowrap">
                      {formatCost(group.apiCost)}
                    </td>

                    {/* Your subscriber cost */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 min-w-[90px]">
                        <span className={`text-xs font-bold ${shareColor(group.subPct)}`}>
                          {formatCost(group.yourCost)}
                        </span>
                        <span
                          className={`text-[10px] ${
                            group.groupValue >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {group.groupValue >= 0
                            ? `↑ +${formatCost(group.groupValue)} value`
                            : `↓ ${formatCost(group.groupValue)} deficit`}
                        </span>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-700">
                          <div
                            className={`h-full rounded-full ${shareBarColor(group.subPct)} transition-all`}
                            style={{ width: `${Math.min(group.subPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* ── Individual prompts (accordion content) ────────────── */}
                  {isOpen &&
                    group.sessions.map((session, j) => (
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
                        title={onSelectSession ? 'Click for prompt drilldown' : undefined}
                        style={{ animationDelay: `${Math.min(j, 12) * 25}ms` }}
                        className={`accordion-row border-b border-slate-700/20 bg-black/30 transition-colors hover:bg-blue-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50 ${
                          onSelectSession ? 'cursor-pointer' : ''
                        } ${j === group.sessions.length - 1 ? 'border-b-slate-700/40' : ''}`}
                      >
                        {/* Prompt (session) */}
                        <td className="px-5 py-2.5">
                          <div className="ml-[26px] flex items-center gap-2 border-l border-slate-700/60 pl-3">
                            <CornerDownRight size={11} className="shrink-0 text-slate-600" />
                            <div className="min-w-0">
                              <span className="block font-mono text-[11px] text-slate-300">
                                {session.sessionId.slice(0, 8)}…
                              </span>
                              <span className="block text-[10px] text-slate-600">
                                {session.messageCount} msgs
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-2.5 text-[11px] text-slate-500 whitespace-nowrap">
                          {formatDate(session.lastActivity)}
                        </td>

                        {/* Model */}
                        <td className="px-4 py-2.5">
                          <span className="rounded-md bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-400 whitespace-nowrap">
                            {getModelBadge(session.models)}
                          </span>
                        </td>

                        {/* Messages */}
                        <td className="hidden px-4 py-2.5 text-[11px] text-slate-400 md:table-cell">
                          {session.messageCount}
                        </td>

                        {/* Tokens */}
                        <td className="px-4 py-2.5 text-[11px] font-medium text-slate-300">
                          {formatTokens(session.totalTok)}
                        </td>

                        {/* Cache hit rate */}
                        <td className="hidden px-4 py-2.5 md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1 w-14 overflow-hidden rounded-full bg-slate-700/40">
                              <div
                                className="h-full rounded-full bg-cyan-600/70"
                                style={{ width: `${session.cachePct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {session.cachePct.toFixed(0)}%
                            </span>
                          </div>
                        </td>

                        {/* API Cost */}
                        <td className="px-4 py-2.5 text-[11px] font-medium text-amber-400/80 whitespace-nowrap">
                          {formatCost(session.estimatedCost)}
                        </td>

                        {/* Your cost */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-baseline gap-2 whitespace-nowrap">
                            <span className={`text-[11px] font-medium ${shareColor(session.subPct)}`}>
                              {formatCost(session.yourCostForSession)}
                            </span>
                            <span
                              className={`text-[10px] ${
                                session.sessionValue >= 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              {session.sessionValue >= 0
                                ? `+${formatCost(session.sessionValue)}`
                                : formatCost(session.sessionValue)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
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

        {sortedGroups.length > 10 && (
          <button
            onClick={() => setShowAllGroups((e) => !e)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            {showAllGroups ? (
              <><ChevronUp size={14} /> Show less</>
            ) : (
              <><ChevronDown size={14} /> Show all {sortedGroups.length} projects</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
