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
  dailyActivity: [],
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
};

beforeEach(() => {
  // Stub localStorage
  const store: Record<string, string> = {};
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] ?? null);
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { store[key] = value; });
  jest.spyOn(Storage.prototype, 'clear').mockImplementation(() => Object.keys(store).forEach((k) => delete store[k]));

  // Stub fetch
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => mockUsageData,
  }) as any;
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Basic rendering ───────────────────────────────────────────────────────────

it('renders the BurnItDown header after data loads', async () => {
  render(<App />);
  const heading = await screen.findByRole('heading', { name: /BurnItDown/i, level: 1 });
  expect(heading).toBeInTheDocument();
});

it('renders the Joseph Bull footer attribution', async () => {
  render(<App />);
  expect(await screen.findByText(/Joseph Bull/i)).toBeInTheDocument();
});

// ── Navigation tabs ───────────────────────────────────────────────────────────

it('shows the Dashboard nav tab', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
});

it('shows the Settings nav tab', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  // At least one settings button (desktop nav)
  const settingsButtons = screen.getAllByRole('button', { name: /settings/i });
  expect(settingsButtons.length).toBeGreaterThan(0);
});

it('shows the Donate nav tab', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  const donateButtons = screen.getAllByRole('button', { name: /donate/i });
  expect(donateButtons.length).toBeGreaterThan(0);
});

it('shows the About nav tab', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  const aboutButtons = screen.getAllByRole('button', { name: /about/i });
  expect(aboutButtons.length).toBeGreaterThan(0);
});

it('navigates to the Donate page when Donate is clicked', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  const donateButtons = screen.getAllByRole('button', { name: /donate/i });
  fireEvent.click(donateButtons[0]);
  expect(await screen.findByRole('heading', { name: /Support BurnItDown/i })).toBeInTheDocument();
});

it('navigates to the About page when About is clicked', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  const aboutButtons = screen.getAllByRole('button', { name: /about/i });
  fireEvent.click(aboutButtons[0]);
  // The About page shows the landing page tagline
  expect(await screen.findByText(/open-source Claude usage analytics/i)).toBeInTheDocument();
});

// ── Light mode toggle ─────────────────────────────────────────────────────────

it('defaults to dark mode', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  const root = screen.getByTestId('app-root');
  expect(root).not.toHaveClass('light-mode');
  expect(root).toHaveAttribute('data-theme', 'dark');
});

it('switches to light mode when theme toggle is clicked', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });

  const toggle = screen.getByTestId('theme-toggle');
  fireEvent.click(toggle);

  const root = screen.getByTestId('app-root');
  expect(root).toHaveClass('light-mode');
  expect(root).toHaveAttribute('data-theme', 'light');
});

it('switches back to dark mode after two theme toggle clicks', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });

  const toggle = screen.getByTestId('theme-toggle');
  fireEvent.click(toggle); // → light
  fireEvent.click(toggle); // → dark

  const root = screen.getByTestId('app-root');
  expect(root).not.toHaveClass('light-mode');
  expect(root).toHaveAttribute('data-theme', 'dark');
});

it('persists theme preference to localStorage when toggled', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });

  const toggle = screen.getByTestId('theme-toggle');
  fireEvent.click(toggle); // → light

  expect(localStorage.setItem).toHaveBeenCalledWith('burnitdown-theme', 'light');
});

it('toggles the ARIA label on the theme button between light and dark mode descriptions', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });

  const toggle = screen.getByTestId('theme-toggle');
  expect(toggle).toHaveAttribute('aria-label', 'Switch to light mode');

  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-label', 'Switch to dark mode');
});

// ── Disclaimer ────────────────────────────────────────────────────────────────

it('renders the data disclaimer on the dashboard', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  expect(screen.getByText(/as-is basis/i)).toBeInTheDocument();
});

// ── Net Value sign convention ─────────────────────────────────────────────────

it('shows positive Net Value when API cost > subscription cost', async () => {
  // mockUsageData has currentPeriodCost $35 and Pro subscription is $20
  // so subscriberNetValue = 35 - 20 = +$15 → positive (subscription worth it)
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  // The "Net Value (Period)" stat card should show "Subscription worth it"
  expect(screen.getByText(/Subscription worth it/i)).toBeInTheDocument();
});

// ── Stat drilldowns ───────────────────────────────────────────────────────────

it('opens a drilldown when "This Period API Cost" stat card is clicked', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  const periodCard = screen.getByRole('button', { name: /This Period API Cost/i });
  fireEvent.click(periodCard);
  expect(await screen.findByText(/Calculation breakdown/i)).toBeInTheDocument();
});

it('opens a drilldown when "All-Time API Equiv." stat card is clicked', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  const allTimeCard = screen.getByRole('button', { name: /All-Time API Equiv/i });
  fireEvent.click(allTimeCard);
  expect(await screen.findByText(/Calculation breakdown/i)).toBeInTheDocument();
});

it('opens a drilldown when "Net Value (Period)" stat card is clicked', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  const netValueCard = screen.getByRole('button', { name: /Net Value \(Period\)/i });
  fireEvent.click(netValueCard);
  expect(await screen.findByText(/Calculation breakdown/i)).toBeInTheDocument();
});

it('closes a drilldown when Escape is pressed', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });

  const periodCard = screen.getByRole('button', { name: /This Period API Cost/i });
  fireEvent.click(periodCard);
  await screen.findByText(/Calculation breakdown/i);

  fireEvent.keyDown(window, { key: 'Escape' });
  await waitFor(() => {
    expect(screen.queryByText(/Calculation breakdown/i)).not.toBeInTheDocument();
  });
});

// ── Sessions table ────────────────────────────────────────────────────────────

it('renders the sessions table', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  const matches = screen.getAllByText(/Session P&L vs Subscription/i);
  expect(matches.length).toBeGreaterThan(0);
});

it('shows both API cost and subscriber cost columns', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /BurnItDown/i });
  // Both column header types should be visible (using getAllByText to handle multiples)
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
