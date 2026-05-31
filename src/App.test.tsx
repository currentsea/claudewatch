import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// ── Mock API response ─────────────────────────────────────────────────────────
const mockUsageData = {
  timestamp: new Date().toISOString(),
  billingPeriodStart: new Date().toISOString(),
  billingDay: 1,
  totalStats: {
    totalMessages: 42,
    totalSessions: 5,
    firstSessionDate: '2026-01-01T00:00:00Z',
    hourCounts: {},
    totalInputTokens: 500_000,
    totalOutputTokens: 200_000,
    totalCacheRead: 100_000,
    totalCacheCreate: 50_000,
    grandTotal: 850_000,
  },
  computedCosts: {
    totalApiCost: 45.50,
    byModel: {
      'claude-sonnet-4-6': {
        cost: 45.50,
        tokens: {
          inputTokens: 500_000,
          outputTokens: 200_000,
          cacheReadInputTokens: 100_000,
          cacheCreationInputTokens: 50_000,
        },
        tier: 'sonnet',
        displayName: 'Claude Sonnet',
        color: '#6366f1',
      },
    },
    currentPeriodCost: 35.00,
    currentPeriodTokens: {
      inputTokens: 350_000,
      outputTokens: 150_000,
      cacheReadInputTokens: 80_000,
      cacheCreationInputTokens: 40_000,
    },
  },
  dailyActivity: [
    {
      date: '2026-05-01',
      messageCount: 10,
      sessionCount: 2,
      toolCallCount: 5,
      totalTokens: 200_000,
      estimatedCost: 12.5,
      inBillingPeriod: true,
    },
    {
      date: '2026-05-15',
      messageCount: 32,
      sessionCount: 3,
      toolCallCount: 18,
      totalTokens: 400_000,
      estimatedCost: 22.5,
      inBillingPeriod: true,
    },
  ],
  monthlyRollup: [],
  sessions: [
    {
      sessionId: 'abc123def',
      project: 'test-project',
      isSubagent: false,
      timestamp: '2026-05-01T10:00:00Z',
      lastActivity: '2026-05-01T11:00:00Z',
      messageCount: 10,
      models: { 'claude-sonnet-4-6': { inputTokens: 1000, outputTokens: 500, cacheReadInputTokens: 200, cacheCreationInputTokens: 100 } },
      totalTokens: { inputTokens: 1000, outputTokens: 500, cacheReadInputTokens: 200, cacheCreationInputTokens: 100 },
      estimatedCost: 0.023,
    },
  ],
  activeSessions: [],
  modelPricing: {
    opus: { displayName: 'Claude Opus', color: '#a855f7', input: 5, output: 25, cacheCreation: 6.25, cacheRead: 0.5 },
    sonnet: { displayName: 'Claude Sonnet', color: '#6366f1', input: 3, output: 15, cacheCreation: 3.75, cacheRead: 0.3 },
    haiku: { displayName: 'Claude Haiku', color: '#06b6d4', input: 1, output: 5, cacheCreation: 1.25, cacheRead: 0.1 },
  },
  claudeDataPath: '/Users/test/.claude',
  claudeDataAvailable: true,
};

const mockNoData = {
  ...mockUsageData,
  sessions: [],
  activeSessions: [],
  totalStats: { ...mockUsageData.totalStats, totalMessages: 0, totalSessions: 0, firstSessionDate: null },
  claudeDataAvailable: false,
  noDataReason: 'missing-claude-dir',
};

function setupFetchMock(usage: any = mockUsageData) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/aggregates')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          rows: [
            {
              project: 'demo/project',
              month: '2026-05',
              tier: 'sonnet',
              sessions: 3,
              messages: 42,
              inputTokens: 100_000,
              outputTokens: 50_000,
              cacheReadInputTokens: 20_000,
              cacheCreationInputTokens: 10_000,
              apiCost: 1.23,
            },
          ],
          totals: { sessions: 3, messages: 42, tokens: 180_000, apiCost: 1.23 },
        }),
      });
    }
    if (url.includes('/api/price-history')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ entries: [] }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => usage });
  }) as any;
}

beforeEach(() => {
  // Stub localStorage
  const store: Record<string, string> = {};
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] ?? null);
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { store[key] = value; });
  jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete store[key]; });
  jest.spyOn(Storage.prototype, 'clear').mockImplementation(() => Object.keys(store).forEach((k) => delete store[k]));

  setupFetchMock();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Basic rendering ───────────────────────────────────────────────────────────

it('renders the ClaudeWatch header after data loads', async () => {
  render(<App />);
  const heading = await screen.findByRole('heading', { name: /ClaudeWatch/i, level: 1 });
  expect(heading).toBeInTheDocument();
});

it('renders the Joseph Bull footer attribution', async () => {
  render(<App />);
  expect(await screen.findByText(/Joseph Bull/i)).toBeInTheDocument();
});

// ── Navigation tabs ───────────────────────────────────────────────────────────

it('shows the Dashboard nav tab', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
});

it('shows the Settings nav tab', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  const settingsButtons = screen.getAllByRole('button', { name: /settings/i });
  expect(settingsButtons.length).toBeGreaterThan(0);
});

it('shows the Donate nav tab', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  const donateButtons = screen.getAllByRole('button', { name: /donate/i });
  expect(donateButtons.length).toBeGreaterThan(0);
});

it('shows the About nav tab', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  const aboutButtons = screen.getAllByRole('button', { name: /about/i });
  expect(aboutButtons.length).toBeGreaterThan(0);
});

it('navigates to the Donate page when Donate is clicked', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  const donateButtons = screen.getAllByRole('button', { name: /donate/i });
  fireEvent.click(donateButtons[0]);
  expect(await screen.findByRole('heading', { name: /Support ClaudeWatch/i })).toBeInTheDocument();
});

it('navigates to the About page when About is clicked', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  const aboutButtons = screen.getAllByRole('button', { name: /about/i });
  fireEvent.click(aboutButtons[0]);
  expect(await screen.findByText(/open-source Claude usage analytics/i)).toBeInTheDocument();
});

// ── Light mode toggle ─────────────────────────────────────────────────────────

it('defaults to dark mode', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  const root = screen.getByTestId('app-root');
  expect(root).not.toHaveClass('light-mode');
  expect(root).toHaveAttribute('data-theme', 'dark');
});

it('switches to light mode when theme toggle is clicked', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });

  const toggle = screen.getByTestId('theme-toggle');
  fireEvent.click(toggle);

  const root = screen.getByTestId('app-root');
  expect(root).toHaveClass('light-mode');
  expect(root).toHaveAttribute('data-theme', 'light');
});

it('switches back to dark mode after two theme toggle clicks', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });

  const toggle = screen.getByTestId('theme-toggle');
  fireEvent.click(toggle); // → light
  fireEvent.click(toggle); // → dark

  const root = screen.getByTestId('app-root');
  expect(root).not.toHaveClass('light-mode');
  expect(root).toHaveAttribute('data-theme', 'dark');
});

it('persists theme preference to localStorage when toggled', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });

  const toggle = screen.getByTestId('theme-toggle');
  fireEvent.click(toggle); // → light

  expect(localStorage.setItem).toHaveBeenCalledWith('claudewatch-theme', 'light');
});

it('toggles the ARIA label on the theme button between light and dark mode descriptions', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });

  const toggle = screen.getByTestId('theme-toggle');
  expect(toggle).toHaveAttribute('aria-label', 'Switch to light mode');

  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-label', 'Switch to dark mode');
});

// ── Disclaimer ────────────────────────────────────────────────────────────────

it('renders the data disclaimer on the dashboard', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  expect(screen.getByText(/as-is basis/i)).toBeInTheDocument();
});

// ── Period P&L card + time range selector ─────────────────────────────────────

// ── Session activity chart ────────────────────────────────────────────────────

it('renders the active vs inactive sessions chart', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  expect(screen.getByTestId('active-count')).toBeInTheDocument();
  expect(screen.getByTestId('inactive-count')).toBeInTheDocument();
});

it('lets the user switch the session activity chart to the by-day view', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  fireEvent.click(screen.getByTestId('activity-mode-timeline'));
  // The by-day view doesn't show the bucket legend
  await waitFor(() => {
    expect(screen.queryByText(/Active now/i)).toBeNull();
  });
});

// ── Subscription tabs visibility ──────────────────────────────────────────────

it('hides the subscription tier selector when a non-Claude provider is selected', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  // Switch to ChatGPT
  fireEvent.click(screen.getByTestId('provider-selector'));
  fireEvent.click(await screen.findByTestId('provider-option-chatgpt'));
  // The Pro/Max 5x/Max 20x buttons live inside SubscriptionSelector; should be gone
  await waitFor(() => {
    expect(screen.queryByRole('button', { name: /^Pro/i })).toBeNull();
  });
});

// ── No-data install screen ────────────────────────────────────────────────────

it('shows install instructions when ~/.claude is missing', async () => {
  setupFetchMock(mockNoData);
  render(<App />);
  expect(
    await screen.findByRole('heading', { name: /No ~\/\.claude directory found/i })
  ).toBeInTheDocument();
  expect(screen.getByText(/Install Claude Code/i)).toBeInTheDocument();
});

// ── Anthropic PnL panel — only all-time (no per-period) ──────────────────────

it('renders only the all-time Anthropic P&L panel (no per-period figure)', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  expect(screen.getByText(/All-time net to Anthropic/i)).toBeInTheDocument();
  expect(screen.queryByText(/This period net/i)).toBeNull();
});

// ── Sessions table ────────────────────────────────────────────────────────────

it('renders the sessions table', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  const matches = screen.getAllByText(/Session P&L vs Subscription/i);
  expect(matches.length).toBeGreaterThan(0);
});

it('shows both API cost and subscriber cost columns', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  const apiCostMatches = screen.getAllByText(/API Cost/i);
  expect(apiCostMatches.length).toBeGreaterThan(0);
  const yourCostMatches = screen.getAllByText(/Your Cost/i);
  expect(yourCostMatches.length).toBeGreaterThan(0);
});

// ── Footer ────────────────────────────────────────────────────────────────────

it('renders the Donate link in the footer', async () => {
  render(<App />);
  await screen.findByText(/Joseph Bull/i);
  const donateLinks = screen.getAllByRole('button', { name: /donate/i });
  expect(donateLinks.length).toBeGreaterThan(0);
});

// ── Anthropic PnL badge explainer ─────────────────────────────────────────────

it('opens the PnL math explainer when the Anthropic profit/loss badge is clicked', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  const badge = screen.getByTestId('pnl-badge-explainer');
  fireEvent.click(badge);
  expect(
    await screen.findByText(/How "[+−].*for Anthropic" is calculated/i)
  ).toBeInTheDocument();
});

// ── Provider selector + coming-soon pages ─────────────────────────────────────

it('renders the provider selector in the header', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  expect(screen.getByTestId('provider-selector')).toBeInTheDocument();
});

it('shows the ChatGPT coming-soon page when chatgpt is selected', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  fireEvent.click(screen.getByTestId('provider-selector'));
  fireEvent.click(await screen.findByTestId('provider-option-chatgpt'));
  expect(
    await screen.findByRole('heading', { name: /ChatGPT support is on the roadmap/i })
  ).toBeInTheDocument();
});

it('shows the Gemini coming-soon page when gemini is selected', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  fireEvent.click(screen.getByTestId('provider-selector'));
  fireEvent.click(await screen.findByTestId('provider-option-gemini'));
  expect(
    await screen.findByRole('heading', { name: /Gemini support is on the roadmap/i })
  ).toBeInTheDocument();
});

it('shows the xAI/Grok coming-soon page when xai is selected', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  fireEvent.click(screen.getByTestId('provider-selector'));
  fireEvent.click(await screen.findByTestId('provider-option-xai'));
  expect(
    await screen.findByRole('heading', { name: /Grok support is on the roadmap/i })
  ).toBeInTheDocument();
});

it('returns to the Claude dashboard from a coming-soon page', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  fireEvent.click(screen.getByTestId('provider-selector'));
  fireEvent.click(await screen.findByTestId('provider-option-chatgpt'));
  fireEvent.click(await screen.findByRole('button', { name: /Back to Claude dashboard/i }));
  await waitFor(() => {
    const subsidyMatches = screen.queryAllByText(/All-time P&L/i);
    expect(subsidyMatches.length).toBeGreaterThan(0);
  });
});

// ── Aggregates subdashboard ───────────────────────────────────────────────────

it('shows the Aggregates nav tab', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  expect(screen.getByRole('button', { name: /aggregates/i })).toBeInTheDocument();
});

it('navigates to the Aggregates page when the tab is clicked', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  fireEvent.click(screen.getByRole('button', { name: /aggregates/i }));
  expect(
    await screen.findByRole('heading', { name: /Project × Month × Model Rollups/i })
  ).toBeInTheDocument();
});

it('lists aggregate rows fetched from /api/aggregates', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  fireEvent.click(screen.getByRole('button', { name: /aggregates/i }));
  expect(await screen.findByText(/demo\/project/)).toBeInTheDocument();
});

it('supports switching aggregate group mode', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /ClaudeWatch/i });
  fireEvent.click(screen.getByRole('button', { name: /aggregates/i }));
  await screen.findByText(/demo\/project/);
  fireEvent.click(screen.getByTestId('agg-group-month'));
  expect(await screen.findByText(/Grouped by month/i)).toBeInTheDocument();
});
