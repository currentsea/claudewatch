import React, { useState } from 'react';
import {
  Flame,
  RefreshCw,
  Zap,
  DollarSign,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Wifi,
} from 'lucide-react';

import { useUsageData } from './hooks/useUsageData';
import { SubscriptionTier } from './types';
import {
  formatCost,
  formatTokens,
  savings,
  anthropicPnL,
  SUBSCRIPTION_TIERS,
} from './utils/pricing';

import { StatCard } from './components/StatCard';
import { UsageChart } from './components/UsageChart';
import { ModelBreakdown } from './components/ModelBreakdown';
import { CostComparison } from './components/CostComparison';
import { BurnMeter } from './components/BurnMeter';
import { TokenBreakdown } from './components/TokenBreakdown';
import { SessionsTable } from './components/SessionsTable';
import { SubscriptionSelector } from './components/SubscriptionSelector';
import { AnthropicPnL } from './components/AnthropicPnL';

// ── Loader ────────────────────────────────────────────────────────────────────
function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="text-center">
        <Flame size={48} className="mx-auto mb-4 animate-bounce text-orange-400" />
        <p className="text-lg font-semibold text-white">Loading usage data…</p>
        <p className="mt-1 text-sm text-slate-400">
          Reading Claude session files
        </p>
      </div>
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
      <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
      <p className="mb-1 text-base font-semibold text-white">
        Could not connect to the API server
      </p>
      <p className="mb-4 text-sm text-red-300">{message}</p>
      <p className="mb-4 text-xs text-slate-400">
        Make sure the backend is running:{' '}
        <code className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">
          npm run server
        </code>
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400 transition-colors"
      >
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [subscriptionCost, setSubscriptionCost] = useState<SubscriptionTier>(20);
  const { data, loading, error, lastUpdated, refresh, secondsUntilRefresh } =
    useUsageData(true);

  if (loading && !data) return <Loader />;

  const sub = SUBSCRIPTION_TIERS.find((t) => t.value === subscriptionCost)!;

  // Derived metrics
  const totalApiCost = data?.computedCosts.totalApiCost ?? 0;
  const currentPeriodCost = data?.computedCosts.currentPeriodCost ?? 0;
  const grandTotal = data?.totalStats.grandTotal ?? 0;
  const totalMessages = data?.totalStats.totalMessages ?? 0;
  const totalSessions = data?.totalStats.totalSessions ?? 0;
  const monthSaved = savings(subscriptionCost, currentPeriodCost);
  const firstSessionDate = data?.totalStats.firstSessionDate ?? null;
  const pnl = anthropicPnL(subscriptionCost, totalApiCost, firstSessionDate);

  // First use date
  const firstDate = data?.totalStats.firstSessionDate
    ? new Date(data.totalStats.firstSessionDate).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-slate-700/60 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/20">
              <Flame size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">
                BurnItDown
              </h1>
              <p className="text-xs text-slate-400 leading-none mt-0.5">
                Claude Usage Dashboard
              </p>
            </div>
          </div>

          {/* Center: subscription selector */}
          <div className="hidden md:block">
            <SubscriptionSelector
              value={subscriptionCost}
              onChange={setSubscriptionCost}
            />
          </div>

          {/* Right: live indicator + refresh */}
          <div className="flex items-center gap-3">
            {/* Live pulse */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              {error ? (
                <span className="flex items-center gap-1 text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  Error
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live · {secondsUntilRefresh}s
                </span>
              )}
            </div>

            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Mobile subscription selector */}
        <div className="border-t border-slate-700/60 px-4 py-2 md:hidden">
          <SubscriptionSelector
            value={subscriptionCost}
            onChange={setSubscriptionCost}
          />
        </div>
      </header>

      {/* ── Billing period banner ───────────────────────────────────────────── */}
      {data && (
        <div className="border-b border-slate-700/30 bg-slate-800/30">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={12} />
              Billing period starts day {data.billingDay} each month
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Activity size={12} />
              Period start:{' '}
              {new Date(data.billingPeriodStart).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <MessageSquare size={12} />
              Active since {firstDate}
            </span>
            {lastUpdated && (
              <span className="ml-auto flex items-center gap-1 text-xs text-slate-500">
                <Wifi size={11} />
                Updated{' '}
                {lastUpdated.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6">
        {error && !data && (
          <ErrorBanner message={error} onRetry={refresh} />
        )}

        {error && data && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            <AlertCircle size={14} /> Refresh error: {error}. Showing last
            known data.
          </div>
        )}

        {data && (
          <>
            {/* ── Section label ─────────────────────────────────────────── */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Overview
              </span>
              <div className="flex-1 border-t border-slate-700/60" />
              <span className={`text-xs font-medium ${sub.color}`}>
                {sub.label} · {sub.description}
              </span>
            </div>

            {/* ── Stat cards ────────────────────────────────────────────── */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard
                title="All-Time Tokens"
                value={formatTokens(grandTotal)}
                subtitle={`${totalMessages.toLocaleString()} messages · ${totalSessions} sessions`}
                icon={Zap}
                iconColor="text-violet-400"
                valueColor="text-violet-300"
              />
              <StatCard
                title="All-Time API Equiv."
                value={formatCost(totalApiCost)}
                subtitle="If charged at Anthropic API rates"
                icon={DollarSign}
                iconColor="text-amber-400"
                valueColor="text-amber-300"
              />
              <StatCard
                title="This Period API Cost"
                value={formatCost(currentPeriodCost)}
                subtitle={`vs ${formatCost(subscriptionCost)} subscription`}
                icon={BarChart2}
                iconColor="text-blue-400"
                valueColor="text-blue-300"
                trend={
                  monthSaved >= 0
                    ? {
                        direction: 'down',
                        label: `Saved ${formatCost(Math.abs(monthSaved))} this period`,
                        good: true,
                      }
                    : {
                        direction: 'up',
                        label: `API cheaper by ${formatCost(Math.abs(monthSaved))}`,
                        good: false,
                      }
                }
              />
              <StatCard
                title="Net Value (Period)"
                value={
                  monthSaved >= 0
                    ? `+${formatCost(monthSaved)}`
                    : formatCost(monthSaved)
                }
                subtitle={
                  monthSaved >= 0
                    ? "Subscription worth it 🎉"
                    : "API would be cheaper"
                }
                icon={TrendingUp}
                iconColor={monthSaved >= 0 ? 'text-emerald-400' : 'text-red-400'}
                valueColor={monthSaved >= 0 ? 'text-emerald-300' : 'text-red-300'}
                badge={
                  monthSaved >= 0
                    ? {
                        label: '✓ Good value',
                        color:
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                      }
                    : {
                        label: '↓ Under-utilised',
                        color:
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                      }
                }
              />
              <StatCard
                title="Anthropic's All-Time Net"
                value={
                  pnl.profit >= 0
                    ? `+${formatCost(pnl.profit)}`
                    : `−${formatCost(Math.abs(pnl.profit))}`
                }
                subtitle={`Over ${pnl.months} month${pnl.months !== 1 ? 's' : ''} · ${formatCost(pnl.revenue)} revenue`}
                icon={pnl.profit >= 0 ? TrendingUp : TrendingDown}
                iconColor={pnl.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}
                valueColor={pnl.profit >= 0 ? 'text-emerald-300' : 'text-red-300'}
                badge={{
                  label: pnl.profit >= 0 ? '📈 Anthropic profits' : '📉 Anthropic loses',
                  color: pnl.profit >= 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20',
                }}
              />
            </div>

            {/* ── Usage chart + Model breakdown ─────────────────────────── */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Activity
              </span>
              <div className="flex-1 border-t border-slate-700/60" />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <UsageChart data={data.dailyActivity} />
              </div>
              <div>
                <ModelBreakdown computedCosts={data.computedCosts} />
              </div>
            </div>

            {/* ── Cost Analysis + Anthropic P&L ─────────────────────────── */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Cost Analysis
              </span>
              <div className="flex-1 border-t border-slate-700/60" />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <BurnMeter
                currentPeriodCost={currentPeriodCost}
                billingPeriodStart={data.billingPeriodStart}
                subscriptionCost={subscriptionCost}
              />
              <CostComparison
                monthlyRollup={data.monthlyRollup}
                subscriptionCost={subscriptionCost}
              />
              <AnthropicPnL
                subscriptionCost={subscriptionCost}
                totalApiCost={totalApiCost}
                currentPeriodCost={currentPeriodCost}
                firstSessionDate={firstSessionDate}
                monthlyRollup={data.monthlyRollup}
              />
            </div>

            {/* ── Token breakdown ───────────────────────────────────────── */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Token Details
              </span>
              <div className="flex-1 border-t border-slate-700/60" />
            </div>

            <div className="mb-6">
              <TokenBreakdown totalStats={data.totalStats} />
            </div>

            {/* ── Pricing reference ─────────────────────────────────────── */}
            <div className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-800/30 p-5">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-slate-500" />
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  API Pricing Reference (per 1M tokens)
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {Object.entries(data.modelPricing).map(([tier, p]: any) => (
                  <div
                    key={tier}
                    className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-3"
                  >
                    <p
                      className="mb-2 text-sm font-semibold"
                      style={{ color: p.color }}
                    >
                      {p.displayName}
                    </p>
                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Input</span>
                        <span className="text-white">${p.input}/M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Output</span>
                        <span className="text-white">${p.output}/M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache write</span>
                        <span className="text-white">${p.cacheCreation}/M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache read</span>
                        <span className="text-white">${p.cacheRead}/M</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-600">
                Prices as of 2025. Update{' '}
                <code className="rounded bg-slate-800/80 px-1 text-slate-400">
                  server/index.js → MODEL_PRICING
                </code>{' '}
                if Anthropic changes rates.
              </p>
            </div>

            {/* ── Sessions table ────────────────────────────────────────── */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Sessions
              </span>
              <div className="flex-1 border-t border-slate-700/60" />
            </div>

            <SessionsTable sessions={data.sessions} />
          </>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-600">
        BurnItDown · reading{' '}
        <code className="rounded bg-slate-800/60 px-1 text-slate-500">
          ~/.claude
        </code>{' '}
        · costs are estimates based on public Anthropic API pricing
      </footer>
    </div>
  );
}
