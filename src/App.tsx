import React, { useState, useCallback } from 'react';
import {
  Flame,
  RefreshCw,
  DollarSign,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  MessageSquare,
  AlertCircle,
  Wifi,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

import { useUsageData } from './hooks/useUsageData';
import { PricingSettings, SubscriptionTier } from './types';
import {
  formatCost,
  savings,
  anthropicPnL,
  buildSubscriptionTiers,
  loadPricingSettings,
  savePricingSettings,
} from './utils/pricing';

import { StatCard } from './components/StatCard';
import { CostComparison } from './components/CostComparison';
import { BurnMeter } from './components/BurnMeter';
import { SubscriptionSelector } from './components/SubscriptionSelector';
import { AnthropicPnL } from './components/AnthropicPnL';
import { PricingSettingsPanel } from './components/PricingSettingsPanel';
import { TickHistory } from './components/TickHistory';

type Page = 'dashboard' | 'settings';

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
  const [page, setPage] = useState<Page>('dashboard');

  // Custom pricing — loaded from localStorage, persisted on every change
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(
    loadPricingSettings
  );

  const handlePricingChange = useCallback((s: PricingSettings) => {
    setPricingSettings(s);
    savePricingSettings(s);
  }, []);

  // Subscription tier (pick the first tier's cost as default)
  const tiers = buildSubscriptionTiers(pricingSettings.subscriptionTiers);
  const [subscriptionCost, setSubscriptionCost] = useState<SubscriptionTier>(
    tiers[0].value
  );

  // Keep subscriptionCost in sync if the user edits tier costs in settings
  // (snap to the nearest tier value when it changes)
  const sub = tiers.find((t) => t.value === subscriptionCost) ?? tiers[0];

  const {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    secondsUntilRefresh,
    intervalMs,
    ticks,
    clearTicks,
  } = useUsageData(true, pricingSettings);

  if (loading && !data) return <Loader />;

  // Derived metrics
  const totalApiCost = data?.computedCosts.totalApiCost ?? 0;
  const currentPeriodCost = data?.computedCosts.currentPeriodCost ?? 0;
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

          {/* Center: nav tabs + subscription selector */}
          <div className="hidden md:flex items-center gap-3">
            {/* Page tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-800/50 p-1">
              <button
                onClick={() => setPage('dashboard')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  page === 'dashboard'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard size={12} /> Dashboard
              </button>
              <button
                onClick={() => setPage('settings')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  page === 'settings'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Settings size={12} /> Settings
              </button>
            </div>

            {/* Subscription selector — only on dashboard */}
            {page === 'dashboard' && (
              <SubscriptionSelector
                value={subscriptionCost}
                onChange={setSubscriptionCost}
                tiers={tiers}
              />
            )}
          </div>

          {/* Right: live indicator + refresh */}
          <div className="flex items-center gap-3">
            {/* Live pulse — only on dashboard */}
            {page === 'dashboard' && (
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
            )}

            {page === 'dashboard' && (
              <button
                onClick={refresh}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition-all disabled:opacity-50"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            )}

            {/* Mobile settings icon */}
            <button
              onClick={() => setPage(page === 'settings' ? 'dashboard' : 'settings')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all md:hidden ${
                page === 'settings'
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Settings size={12} />
              {page === 'settings' ? 'Dashboard' : 'Settings'}
            </button>
          </div>
        </div>

        {/* Mobile subscription selector — only on dashboard */}
        {page === 'dashboard' && (
          <div className="border-t border-slate-700/60 px-4 py-2 md:hidden">
            <SubscriptionSelector
              value={subscriptionCost}
              onChange={setSubscriptionCost}
              tiers={tiers}
            />
          </div>
        )}
      </header>

      {/* ── Settings page ──────────────────────────────────────────────────── */}
      {page === 'settings' && (
        <PricingSettingsPanel
          settings={pricingSettings}
          onChange={handlePricingChange}
        />
      )}

      {/* ── Dashboard page ─────────────────────────────────────────────────── */}
      {page === 'dashboard' && (
        <>
          {/* ── Billing period banner ──────────────────────────────────────── */}
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
                {/* ── Section label ───────────────────────────────────────── */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Overview
                  </span>
                  <div className="flex-1 border-t border-slate-700/60" />
                  <span className={`text-xs font-medium ${sub.color}`}>
                    {sub.label} · {sub.description}
                  </span>
                </div>

                {/* ── Stat cards ──────────────────────────────────────────── */}
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                        ? 'Subscription worth it 🎉'
                        : 'API would be cheaper'
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

                {/* ── Cost Analysis + Anthropic P&L ───────────────────────── */}
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

                {/* ── Tick history ────────────────────────────────────────── */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Spending Per Tick
                  </span>
                  <div className="flex-1 border-t border-slate-700/60" />
                </div>

                <div className="mb-6">
                  <TickHistory
                    ticks={ticks}
                    intervalMs={intervalMs}
                    onClear={clearTicks}
                  />
                </div>

              </>
            )}
          </main>
        </>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-600">
        BurnItDown · reading{' '}
        <code className="rounded bg-slate-800/60 px-1 text-slate-500">
          ~/.claude
        </code>{' '}
        · costs are estimates based on public Anthropic API pricing ·{' '}
        <button
          onClick={() => setPage('settings')}
          className="underline hover:text-slate-400 transition-colors"
        >
          edit pricing
        </button>
      </footer>
    </div>
  );
}
