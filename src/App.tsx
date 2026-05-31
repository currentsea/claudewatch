import React, { useState, useCallback, useEffect } from 'react';
import {
  Eye,
  RefreshCw,
  Activity,
  Clock,
  MessageSquare,
  AlertCircle,
  Wifi,
  Settings,
  LayoutDashboard,
  Code,
  Heart,
  Globe,
  Sun,
  Moon,
  Info,
  Wrench,
  Cpu,
  Database,
  Receipt,
} from 'lucide-react';

import { useUsageData } from './hooks/useUsageData';
import { PricingSettings, SubscriptionTier } from './types';
import {
  formatCost,
  buildSubscriptionTiers,
  loadPricingSettings,
  savePricingSettings,
  buildTimeRange,
  TimeRange,
} from './utils/pricing';

import { BurnMeter } from './components/BurnMeter';
import { SubscriptionSelector } from './components/SubscriptionSelector';
import { AnthropicPnL } from './components/AnthropicPnL';
import { PricingSettingsPanel } from './components/PricingSettingsPanel';
import { SessionsTable } from './components/SessionsTable';
import { SubsidyHero } from './components/SubsidyHero';
import { CostFlowDiagram } from './components/CostFlowDiagram';
import { ActiveSessionsPanel } from './components/ActiveSessionsPanel';
import { SessionDrilldownModal } from './components/SessionDrilldownModal';
import { DonatePage } from './components/DonatePage';
import { LandingPage } from './components/LandingPage';
import { AggregatesDashboard } from './components/AggregatesDashboard';
import { ProviderSelector, Provider } from './components/ProviderSelector';
import { ComingSoonProvider } from './components/ComingSoonProvider';
import { PeriodPnLCard } from './components/PeriodPnLCard';
import { SessionActivityChart } from './components/SessionActivityChart';
import { NoDataInstall } from './components/NoDataInstall';

type Page = 'dashboard' | 'aggregates' | 'settings' | 'donate' | 'about';

const THEME_KEY = 'claudewatch-theme';
const LEGACY_THEME_KEY = 'burnitdown-theme';

function loadTheme(): 'dark' | 'light' {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light') return 'light';
    if (stored === 'dark') return 'dark';
    // Migrate legacy key
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy === 'light' || legacy === 'dark') {
      try {
        localStorage.setItem(THEME_KEY, legacy);
        localStorage.removeItem(LEGACY_THEME_KEY);
      } catch {}
      return legacy;
    }
  } catch {}
  return 'dark';
}

function saveTheme(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

// ── Loader ────────────────────────────────────────────────────────────────────
function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="text-center">
        <Eye size={48} className="mx-auto mb-4 animate-pulse text-emerald-400" />
        <p className="text-lg font-semibold text-white">Loading usage data…</p>
        <p className="mt-1 text-sm text-slate-400">Reading Claude session files</p>
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

// ── Disclaimer banner ─────────────────────────────────────────────────────────
function DisclaimerBanner() {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/70 leading-relaxed">
      <div className="flex gap-2">
        <Info size={13} className="mt-0.5 shrink-0 text-amber-400/70" />
        <p>
          <strong className="text-amber-300/80">Data disclaimer:</strong>{' '}
          ClaudeWatch provides cost estimates for informational purposes only. All figures
          are derived from local session files and publicly available API pricing, and may
          not reflect your actual billing. Anthropic's true compute costs differ from
          published API list prices. We take no responsibility for the accuracy of the data
          presented. All information is provided on an as-is basis. It is ultimately the
          end user's responsibility to validate their cost–benefit analysis when using AI
          assistance tools.{' '}
          <a
            href="https://www.anthropic.com/pricing"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-amber-200"
          >
            Verify rates at anthropic.com/pricing
          </a>
          .
        </p>
      </div>
    </div>
  );
}

// ── Tools & MCP info panel ────────────────────────────────────────────────────
function ToolsInfoPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-black/10 p-5 backdrop-blur-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Wrench size={14} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">
            Tools &amp; MCP Servers Detected
          </h3>
        </div>
        <span className="text-xs text-slate-500">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            ClaudeWatch reads your Claude session files which contain tool-use records. Below
            is a breakdown of what types of tool calls are tracked in your usage data. MCP
            (Model Context Protocol) servers extend Claude's capabilities with additional
            tools — if you use any, their calls count toward your token usage and are
            included in the cost calculations above.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                icon: Wrench,
                color: 'text-cyan-400',
                title: 'Built-in Claude Code Tools',
                items: [
                  'Read / Write / Edit (file operations)',
                  'Bash (shell command execution)',
                  'WebFetch / WebSearch (web access)',
                  'Agent (spawning sub-agents)',
                  'LSP / NotebookEdit / Grep (code tools)',
                ],
              },
              {
                icon: Cpu,
                color: 'text-violet-400',
                title: 'MCP Server Tools',
                items: [
                  'Any MCP tools you have connected',
                  'Database connectors (Notion, Shopify, etc.)',
                  'API connectors (Gmail, Stripe, etc.)',
                  'Each MCP tool call consumes tokens',
                  'Visible in session drilldown timelines',
                ],
              },
            ].map(({ icon: Icon, color, title, items }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-700/40 bg-black/20 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon size={13} className={color} />
                  <p className="text-xs font-semibold text-slate-300">{title}</p>
                </div>
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-600">
            Tool usage appears in the "Tool uses" column of the session table and in the
            message timeline of any session drilldown. Each tool call's tokens are included
            in the API cost calculation.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [provider, setProvider] = useState<Provider>('claude');
  const [drilldownSessionId, setDrilldownSessionId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(loadTheme);
  // Default to the all-time (since-subscription) view so the headline reflects
  // the full life of the $200/mo plan (anchored to May 30, 2025), not just the
  // current calendar month.
  const [timeRange, setTimeRange] = useState<TimeRange>(() => buildTimeRange('allTime'));

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(loadPricingSettings);

  const handlePricingChange = useCallback((s: PricingSettings) => {
    setPricingSettings(s);
    savePricingSettings(s);
  }, []);

  const tiers = buildSubscriptionTiers(pricingSettings.subscriptionTiers);
  // Default to the Max 20× ($200/mo) plan.
  const [subscriptionCost, setSubscriptionCost] = useState<SubscriptionTier>(
    pricingSettings.subscriptionTiers.max20x
  );
  const sub = tiers.find((t) => t.value === subscriptionCost) ?? tiers[0];

  const {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    secondsUntilRefresh,
  } = useUsageData(true, pricingSettings);

  if (loading && !data) return <Loader />;

  // ── Derived metrics ───────────────────────────────────────────────────────
  const completedApiCost = data?.computedCosts.totalApiCost ?? 0;
  // Add in-flight active session costs so the all-time totals stay current.
  const activeSessionsCost = (data?.activeSessions ?? []).reduce(
    (sum, s) => sum + (s.estimatedCost ?? 0),
    0
  );
  const totalApiCost = completedApiCost + activeSessionsCost;
  const currentPeriodCost = data?.computedCosts.currentPeriodCost ?? 0;

  const firstDate = data?.totalStats.firstSessionDate
    ? new Date(data.totalStats.firstSessionDate).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const totalAllTimeTokens =
    (data?.totalStats.totalInputTokens ?? 0) +
    (data?.totalStats.totalOutputTokens ?? 0) +
    (data?.totalStats.totalCacheRead ?? 0) +
    (data?.totalStats.totalCacheCreate ?? 0);

  const showInstallInstructions =
    !!data &&
    page === 'dashboard' &&
    provider === 'claude' &&
    data.claudeDataAvailable === false;

  return (
    <div
      className={`min-h-screen bg-slate-900 text-slate-100 ${theme === 'light' ? 'light-mode' : ''}`}
      data-testid="app-root"
      data-theme={theme}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-slate-700/60 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-lg shadow-emerald-500/20">
              <Eye size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">
                ClaudeWatch
              </h1>
              <p className="text-xs text-slate-400 leading-none mt-0.5">
                Claude Usage Dashboard
              </p>
            </div>
          </div>

          {/* Center nav */}
          <div className="hidden md:flex items-center gap-3">
            <nav className="flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-800/50 p-1">
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
                onClick={() => setPage('aggregates')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  page === 'aggregates'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database size={12} /> Aggregates
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
              <button
                onClick={() => setPage('about')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  page === 'about'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe size={12} /> About
              </button>
              <button
                onClick={() => setPage('donate')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  page === 'donate'
                    ? 'bg-rose-700 text-white'
                    : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                <Heart size={12} /> Donate
              </button>
            </nav>

            {/* Claude subscription tabs — only shown for the Claude provider on the dashboard */}
            {page === 'dashboard' && provider === 'claude' && data?.claudeDataAvailable && (
              <div
                className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-2 py-1"
                aria-label="Claude subscription tier"
              >
                <span className="hidden lg:inline text-[10px] uppercase tracking-widest text-emerald-300/80">
                  Plan
                </span>
                <SubscriptionSelector
                  value={subscriptionCost}
                  onChange={setSubscriptionCost}
                  tiers={tiers}
                />
              </div>
            )}
          </div>

          {/* Right: provider selector + theme toggle + live indicator + refresh */}
          <div className="flex items-center gap-2">
            <ProviderSelector value={provider} onChange={setProvider} />

            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition-all"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              data-testid="theme-toggle"
            >
              {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
              <span className="hidden sm:inline">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>

            {page === 'dashboard' && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                {error ? (
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="h-2 w-2 rounded-full bg-red-400" /> Error
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

        {/* Mobile: Claude subscription tabs */}
        {page === 'dashboard' && provider === 'claude' && data?.claudeDataAvailable && (
          <div className="border-t border-slate-700/60 px-4 py-2 md:hidden">
            <SubscriptionSelector
              value={subscriptionCost}
              onChange={setSubscriptionCost}
              tiers={tiers}
            />
          </div>
        )}
      </header>

      {/* ── Coming-soon provider takeover ──────────────────────────────────── */}
      {provider !== 'claude' && page === 'dashboard' && (
        <ComingSoonProvider
          provider={provider}
          onSwitchToClaude={() => setProvider('claude')}
        />
      )}

      {/* ── Aggregates page ────────────────────────────────────────────────── */}
      {page === 'aggregates' && (
        <AggregatesDashboard subscriptionCost={subscriptionCost} />
      )}

      {/* ── Settings page ──────────────────────────────────────────────────── */}
      {page === 'settings' && (
        <PricingSettingsPanel settings={pricingSettings} onChange={handlePricingChange} />
      )}

      {/* ── Donate page ────────────────────────────────────────────────────── */}
      {page === 'donate' && <DonatePage />}

      {/* ── About / Landing page ───────────────────────────────────────────── */}
      {page === 'about' && <LandingPage />}

      {/* ── No-data install screen (Claude provider, dashboard) ────────────── */}
      {showInstallInstructions && data && (
        <NoDataInstall
          reason={data.noDataReason ?? 'missing-claude-dir'}
          claudeDataPath={data.claudeDataPath}
          onRetry={refresh}
        />
      )}

      {/* ── Dashboard page (Claude only, data available) ───────────────────── */}
      {page === 'dashboard' && provider === 'claude' && !showInstallInstructions && (
        <>
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
                  <Receipt size={12} />
                  Plan started May 30, 2025
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <MessageSquare size={12} />
                  Usage data since {firstDate}
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
            {error && !data && <ErrorBanner message={error} onRetry={refresh} />}

            {error && data && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
                <AlertCircle size={14} /> Refresh error: {error}. Showing last known data.
              </div>
            )}

            {data && (
              <>
                {/* ── Disclaimer ───────────────────────────────────────────────── */}
                <div className="mb-6">
                  <DisclaimerBanner />
                </div>

                {/* ── Period P&L hero ──────────────────────────────────────────── */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Current P&amp;L
                  </span>
                  <div className="flex-1 border-t border-slate-700/60" />
                  <span className={`text-xs font-medium ${sub.color}`}>
                    {sub.label} · {sub.description}
                  </span>
                </div>

                <div className="mb-6">
                  <PeriodPnLCard
                    range={timeRange}
                    onChangeRange={setTimeRange}
                    dailyActivity={data.dailyActivity}
                    totalApiCost={totalApiCost}
                    subscriptionCost={subscriptionCost}
                    subscriptionLabel={`${sub.label} (${formatCost(subscriptionCost)}/mo)`}
                    currentBillingPeriodCost={currentPeriodCost}
                    billingPeriodStart={data.billingPeriodStart}
                  />
                </div>

                <div className="mb-6">
                  <ActiveSessionsPanel
                    activeSessions={data.activeSessions || []}
                    onSelectSession={(id) => setDrilldownSessionId(id)}
                  />
                </div>

                {/* ── Session activity ─────────────────────────────────────────── */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Sessions
                  </span>
                  <div className="flex-1 border-t border-slate-700/60" />
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <SessionActivityChart
                    sessions={data.sessions}
                    activeSessions={data.activeSessions || []}
                    dailyActivity={data.dailyActivity}
                  />
                  <BurnMeter
                    currentPeriodCost={currentPeriodCost}
                    billingPeriodStart={data.billingPeriodStart}
                    subscriptionCost={subscriptionCost}
                  />
                </div>

                {/* ── All-time Anthropic perspective (no monthly figures) ──────── */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    All-time Anthropic perspective
                  </span>
                  <div className="flex-1 border-t border-slate-700/60" />
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <SubsidyHero
                    subscriptionCost={subscriptionCost}
                    totalApiCost={totalApiCost}
                    currentPeriodCost={currentPeriodCost}
                    subscriptionLabel={`${sub.label} (${formatCost(subscriptionCost)}/mo)`}
                    billingPeriodStart={data.billingPeriodStart}
                  />
                  <AnthropicPnL
                    subscriptionCost={subscriptionCost}
                    totalApiCost={totalApiCost}
                    claudeDesignMonthlyCost={pricingSettings.claudeDesignMonthlyCost}
                  />
                </div>

                {/* ── How we get the numbers ───────────────────────────────────── */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    How we get the numbers
                  </span>
                  <div className="flex-1 border-t border-slate-700/60" />
                </div>

                <div className="mb-6">
                  <CostFlowDiagram data={data} subscriptionCost={subscriptionCost} />
                </div>

                {/* ── Tools & MCP ──────────────────────────────────────────────── */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Tools &amp; Integrations
                  </span>
                  <div className="flex-1 border-t border-slate-700/60" />
                </div>

                <div className="mb-6">
                  <ToolsInfoPanel />
                </div>

                {/* ── Session P&L ──────────────────────────────────────────────── */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Session P&amp;L vs Subscription
                  </span>
                  <div className="flex-1 border-t border-slate-700/60" />
                  <span className={`text-xs font-medium ${sub.color}`}>
                    {sub.label} · {formatCost(subscriptionCost)}/mo
                  </span>
                </div>

                <div className="mb-6">
                  <SessionsTable
                    sessions={data.sessions}
                    subscriptionCost={subscriptionCost}
                    onSelectSession={(id) => setDrilldownSessionId(id)}
                  />
                </div>
              </>
            )}
          </main>
        </>
      )}

      {/* ── Session drilldown modal ─────────────────────────────────────────── */}
      {drilldownSessionId && (
        <SessionDrilldownModal
          sessionId={drilldownSessionId}
          pricingSettings={pricingSettings}
          subscriptionCost={subscriptionCost}
          totalAllTimeTokens={totalAllTimeTokens}
          onClose={() => setDrilldownSessionId(null)}
        />
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-950/40 py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-slate-500 sm:flex-row">
            <p>
              © 2026{' '}
              <a
                href="https://github.com/currentsea"
                target="_blank"
                rel="noreferrer"
                className="text-slate-300 underline-offset-2 hover:text-white hover:underline"
              >
                Joseph Bull
              </a>{' '}
              · MIT licensed
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <a
                href="https://github.com/currentsea/claudewatch"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white"
              >
                <Code size={12} />
                github.com/currentsea/claudewatch
              </a>
              <span className="text-slate-700">·</span>
              <span>
                Reading{' '}
                <code className="rounded bg-slate-800/60 px-1 text-slate-400">
                  ~/.claude
                </code>
              </span>
              <span className="text-slate-700">·</span>
              <button
                onClick={() => setPage('settings')}
                className="underline-offset-2 hover:text-slate-300 hover:underline"
              >
                Edit pricing
              </button>
              <span className="text-slate-700">·</span>
              <button
                onClick={() => setPage('donate')}
                className="flex items-center gap-1 text-rose-400 underline-offset-2 hover:text-rose-300 hover:underline"
              >
                <Heart size={11} /> Donate
              </button>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] text-slate-700">
            Costs are estimates based on{' '}
            <a
              href="https://docs.anthropic.com/en/docs/about-claude/pricing"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:text-slate-500 hover:underline"
            >
              Anthropic's public API pricing
            </a>
            . ClaudeWatch is unaffiliated with Anthropic. All figures are
            provided as-is for informational purposes only.
          </p>
        </div>
      </footer>
    </div>
  );
}
