import React, { useEffect, useRef, useState } from 'react';
import {
  X, Loader2, MessageSquare, User, Bot, Folder, GitBranch,
  DollarSign, Wrench, TrendingUp, TrendingDown, Info,
} from 'lucide-react';
import { PricingSettings, SessionDetail } from '../types';
import { formatCost, formatTokens } from '../utils/pricing';

interface Props {
  sessionId: string;
  pricingSettings: PricingSettings;
  subscriptionCost?: number;
  totalAllTimeTokens?: number;
  onClose: () => void;
}

export function SessionDrilldownModal({
  sessionId,
  pricingSettings,
  subscriptionCost = 0,
  totalAllTimeTokens = 0,
  onClose,
}: Props) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showCostExplainer, setShowCostExplainer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    const url = `/api/sessions/${encodeURIComponent(
      sessionId
    )}?pricing=${encodeURIComponent(
      JSON.stringify(pricingSettings.modelPricing)
    )}`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setDetail(json);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || 'Failed to load session');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, pricingSettings]);

  // ESC closes
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Move focus into the dialog on open and restore it to the trigger on close.
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  const total =
    (detail?.totalTokens.inputTokens ?? 0) +
    (detail?.totalTokens.outputTokens ?? 0) +
    (detail?.totalTokens.cacheReadInputTokens ?? 0) +
    (detail?.totalTokens.cacheCreationInputTokens ?? 0);

  // ── Cost attribution ───────────────────────────────────────────────────────
  // "API cost (to Anthropic)" — what Anthropic spent to serve this session at list price
  const apiCostToAnthropic = detail?.estimatedCost ?? 0;

  // "Your subscriber cost" — your proportional share of the monthly fee for this session
  // = (session tokens / total all-time tokens) × monthly subscription fee
  const sessionShare = totalAllTimeTokens > 0 ? total / totalAllTimeTokens : 0;
  const yourSubscriberCost = sessionShare * subscriptionCost;

  // Net value for this session: positive = you got more value than you paid
  const sessionNetValue = apiCostToAnthropic - yourSubscriberCost;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-drilldown-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-700/60 bg-slate-900 shadow-2xl sm:h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-slate-700/60 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Session drilldown
            </p>
            <h2
              id="session-drilldown-title"
              className="truncate text-base font-bold text-white"
            >
              {detail?.project || sessionId}
            </h2>
            <p className="font-mono text-xs text-slate-500">{sessionId}</p>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
            aria-label="Close drilldown"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-black/10">
          {loading && (
            <div className="flex h-64 items-center justify-center text-slate-500">
              <Loader2 size={20} className="mr-2 animate-spin" />
              Loading session…
            </div>
          )}

          {err && (
            <div className="m-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {err}
            </div>
          )}

          {detail && !loading && (
            <>
              {/* Top stats */}
              <div className="grid grid-cols-2 gap-3 border-b border-slate-700/60 bg-black/10 px-5 py-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Messages</p>
                  <p className="text-sm font-bold text-white">
                    {detail.messageCount} asst · {detail.userMessageCount} user
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tokens</p>
                  <p className="text-sm font-bold text-violet-300">
                    {formatTokens(total)}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <Wrench size={11} /> Tool uses
                  </p>
                  <p className="text-sm font-bold text-cyan-300">
                    {detail.toolUseCount}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <DollarSign size={11} /> API cost
                  </p>
                  <p className="text-sm font-bold text-amber-300">
                    {formatCost(apiCostToAnthropic)}
                  </p>
                </div>
              </div>

              {/* ── Cost attribution panel ─────────────────────────────────────── */}
              <div className="border-b border-slate-700/60 bg-black/5 px-5 py-4">
                <div className="mb-2 flex items-center gap-2">
                  <DollarSign size={13} className="text-slate-500" />
                  <p className="text-xs font-semibold text-slate-300">
                    Cost attribution
                  </p>
                  <button
                    onClick={() => setShowCostExplainer((v) => !v)}
                    className="ml-auto flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400"
                  >
                    <Info size={11} /> {showCostExplainer ? 'hide' : 'explain this'}
                  </button>
                </div>

                {showCostExplainer && (
                  <div className="mb-3 rounded-xl border border-slate-700/40 bg-black/20 p-3 text-xs text-slate-500 leading-relaxed">
                    <p className="mb-1.5 font-semibold text-slate-300">Two different "costs" for one session</p>
                    <ul className="space-y-1.5">
                      <li>
                        <strong className="text-amber-400">API cost (to Anthropic):</strong>{' '}
                        The dollar value of your token usage at Anthropic's published API list
                        price. This approximates what Anthropic spent in compute to serve your
                        session. Formula:{' '}
                        <code className="rounded bg-slate-800/60 px-1">
                          Σ(tokens × model_rate / 1M)
                        </code>
                      </li>
                      <li>
                        <strong className="text-blue-400">Your subscriber cost:</strong>{' '}
                        Your flat monthly fee, multiplied by this session's share of your total
                        token usage. Formula:{' '}
                        <code className="rounded bg-slate-800/60 px-1">
                          (session tokens / all-time tokens) × ${subscriptionCost}/mo
                        </code>
                      </li>
                      <li>
                        <strong className={sessionNetValue >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          Net value:
                        </strong>{' '}
                        {sessionNetValue >= 0
                          ? 'API cost exceeds your subscriber share — this session was worth it!'
                          : 'Your subscriber share exceeds the API cost — you could have saved money on pure API for this session.'}
                      </li>
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* API cost (Anthropic's expense) */}
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <p className="text-xs text-amber-300/80">API cost (Anthropic exp.)</p>
                    <p className="mt-0.5 text-xl font-bold text-amber-300">
                      {formatCost(apiCostToAnthropic)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      At Anthropic API list price
                    </p>
                  </div>

                  {/* Your subscriber cost */}
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
                    <p className="text-xs text-blue-300/80">Your subscriber cost</p>
                    <p className="mt-0.5 text-xl font-bold text-blue-300">
                      {formatCost(yourSubscriberCost)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {(sessionShare * 100).toFixed(2)}% of {formatCost(subscriptionCost)}/mo
                    </p>
                  </div>

                  {/* Net value for this session */}
                  <div
                    className={`rounded-xl border px-4 py-3 ${
                      sessionNetValue >= 0
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-red-500/30 bg-red-500/10'
                    }`}
                  >
                    <p
                      className={`text-xs ${
                        sessionNetValue >= 0 ? 'text-emerald-300/80' : 'text-red-300/80'
                      }`}
                    >
                      Net value (you vs Anthropic)
                    </p>
                    <p
                      className={`mt-0.5 flex items-center gap-1 text-xl font-bold ${
                        sessionNetValue >= 0 ? 'text-emerald-300' : 'text-red-300'
                      }`}
                    >
                      {sessionNetValue >= 0 ? (
                        <TrendingUp size={16} />
                      ) : (
                        <TrendingDown size={16} />
                      )}
                      {sessionNetValue >= 0
                        ? `+${formatCost(sessionNetValue)}`
                        : `−${formatCost(Math.abs(sessionNetValue))}`}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {sessionNetValue >= 0
                        ? '✓ Worth it for you'
                        : '✗ API would be cheaper'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="border-b border-slate-700/60 bg-black/10 px-5 py-3 text-xs text-slate-400">
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  {detail.cwd && (
                    <span className="flex items-center gap-1.5">
                      <Folder size={11} className="text-slate-500" />
                      <code className="rounded bg-slate-800/60 px-1 text-slate-300">
                        {detail.cwd}
                      </code>
                    </span>
                  )}
                  {detail.gitBranch && (
                    <span className="flex items-center gap-1.5">
                      <GitBranch size={11} className="text-slate-500" />
                      {detail.gitBranch}
                    </span>
                  )}
                  {detail.timestamp && (
                    <span>
                      Started {new Date(detail.timestamp).toLocaleString('en-US')}
                    </span>
                  )}
                  {detail.lastActivity && (
                    <span>
                      Last activity{' '}
                      {new Date(detail.lastActivity).toLocaleString('en-US')}
                    </span>
                  )}
                </div>
              </div>

              {/* Per-model breakdown */}
              <div className="border-b border-slate-700/60 px-5 py-3 text-xs">
                <p className="mb-2 font-semibold text-slate-400">Per-model tokens</p>
                <div className="space-y-1">
                  {Object.entries(detail.models).map(([model, t]) => {
                    const sub =
                      t.inputTokens +
                      t.outputTokens +
                      t.cacheReadInputTokens +
                      t.cacheCreationInputTokens;
                    return (
                      <div
                        key={model}
                        className="flex items-center justify-between gap-3 rounded-md bg-black/20 px-2 py-1.5"
                      >
                        <code className="truncate text-xs text-slate-300">{model}</code>
                        <span className="text-xs text-slate-500">
                          in {formatTokens(t.inputTokens)} · out{' '}
                          {formatTokens(t.outputTokens)} · cache-r{' '}
                          {formatTokens(t.cacheReadInputTokens)} · cache-w{' '}
                          {formatTokens(t.cacheCreationInputTokens)} ={' '}
                          <span className="text-violet-300">{formatTokens(sub)}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Message timeline */}
              <div className="px-5 py-4">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquare size={12} className="text-slate-500" />
                  <p className="text-xs font-semibold text-slate-400">
                    Message timeline ({detail.messages.length})
                  </p>
                </div>
                {detail.messages.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No message bodies were captured for this session.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {detail.messages.map((m, i) => {
                      const isAsst = m.role === 'assistant';
                      const Icon = isAsst ? Bot : User;
                      return (
                        <li
                          key={i}
                          className={`flex gap-2 rounded-xl border p-2.5 text-xs ${
                            isAsst
                              ? 'border-violet-500/20 bg-violet-500/5'
                              : 'border-slate-700/40 bg-black/20'
                          }`}
                        >
                          <Icon
                            size={14}
                            className={isAsst ? 'text-violet-300' : 'text-slate-400'}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                              <span className={isAsst ? 'text-violet-300' : 'text-slate-300'}>
                                {isAsst ? 'assistant' : 'user'}
                              </span>
                              {m.timestamp && (
                                <span>
                                  {new Date(m.timestamp).toLocaleTimeString('en-US')}
                                </span>
                              )}
                              {isAsst && m.model && (
                                <code className="rounded bg-slate-800 px-1 text-slate-400">
                                  {m.model}
                                </code>
                              )}
                              {isAsst && m.tokens && (
                                <span>
                                  in {formatTokens(m.tokens.inputTokens)} · out{' '}
                                  {formatTokens(m.tokens.outputTokens)}
                                </span>
                              )}
                              {isAsst && m.toolUses ? (
                                <span className="text-cyan-400">
                                  {m.toolUses} tool use{m.toolUses !== 1 ? 's' : ''}
                                </span>
                              ) : null}
                            </div>
                            <pre className="whitespace-pre-wrap break-words font-sans text-slate-300">
                              {m.preview || (
                                <span className="text-slate-600">(no text content)</span>
                              )}
                            </pre>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
