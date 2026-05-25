import {
  formatCost,
  formatTokens,
  savings,
  projectMonthly,
  formatMonthLabel,
  monthsActive,
  anthropicPnL,
  getCustomerRating,
  buildSubscriptionTiers,
  loadPricingSettings,
  savePricingSettings,
  DEFAULT_PRICING_SETTINGS,
  STORAGE_KEY,
} from './pricing';

// ── formatCost ────────────────────────────────────────────────────────────────
describe('formatCost', () => {
  it('formats whole-dollar amounts with 2 decimal places', () => {
    expect(formatCost(20)).toBe('$20.00');
  });

  it('uses 4 decimal places for sub-dollar values', () => {
    expect(formatCost(0.1234)).toBe('$0.1234');
    expect(formatCost(0.0001)).toBe('$0.0001');
  });

  it('uses k-suffix for >= $1000', () => {
    expect(formatCost(1000)).toBe('$1.00k');
    expect(formatCost(12345.67)).toBe('$12.35k');
  });

  it('handles zero', () => {
    expect(formatCost(0)).toBe('$0.0000');
  });

  it('handles negative values (current behaviour: routes by magnitude, sign passes through)', () => {
    // formatCost uses the raw value for thresholds, so any negative value
    // (which is < 1) drops to the 4-decimal branch.
    expect(formatCost(-0.5)).toBe('$-0.5000');
    expect(formatCost(-20)).toBe('$-20.0000');
  });
});

// ── formatTokens ──────────────────────────────────────────────────────────────
describe('formatTokens', () => {
  it('formats <1k as a raw integer string', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(123)).toBe('123');
    expect(formatTokens(999)).toBe('999');
  });

  it('formats thousands with K suffix and 1 decimal', () => {
    expect(formatTokens(1000)).toBe('1.0K');
    expect(formatTokens(12345)).toBe('12.3K');
  });

  it('formats millions with M suffix and 2 decimals', () => {
    expect(formatTokens(1_000_000)).toBe('1.00M');
    expect(formatTokens(2_500_000)).toBe('2.50M');
  });

  it('formats billions with B suffix and 2 decimals', () => {
    expect(formatTokens(1_000_000_000)).toBe('1.00B');
    expect(formatTokens(3_456_000_000)).toBe('3.46B');
  });
});

// ── savings ───────────────────────────────────────────────────────────────────
describe('savings', () => {
  it('returns positive when subscription > api cost (user is saving)', () => {
    expect(savings(20, 12)).toBe(8);
  });

  it('returns negative when api cost > subscription (under-utilised)', () => {
    expect(savings(20, 50)).toBe(-30);
  });

  it('returns 0 at break-even', () => {
    expect(savings(20, 20)).toBe(0);
  });
});

// ── projectMonthly ────────────────────────────────────────────────────────────
describe('projectMonthly', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern' as any);
    jest.setSystemTime(new Date('2026-05-15T12:00:00Z').getTime());
  });
  afterEach(() => jest.useRealTimers());

  it('extrapolates current cost to a 30-day month', () => {
    // 14 days into the period, $14 spent → $30 projected
    const projected = projectMonthly(14, '2026-05-01T12:00:00Z');
    expect(projected).toBeCloseTo(30, 1);
  });

  it('clamps days-elapsed to at least 1 (avoids divide-by-zero)', () => {
    // Period started one hour ago; would be ~0.04 days. Should treat as 1.
    const start = new Date('2026-05-15T11:00:00Z').toISOString();
    const projected = projectMonthly(5, start);
    // 5 / 1 * 30 = 150
    expect(projected).toBe(150);
  });

  it('returns 0 if no cost has been incurred', () => {
    expect(projectMonthly(0, '2026-05-01T12:00:00Z')).toBe(0);
  });
});

// ── formatMonthLabel ──────────────────────────────────────────────────────────
describe('formatMonthLabel', () => {
  it('formats YYYY-MM into "Mon YYYY"', () => {
    expect(formatMonthLabel('2026-02')).toBe('Feb 2026');
    expect(formatMonthLabel('2025-12')).toBe('Dec 2025');
  });
});

// ── monthsActive ──────────────────────────────────────────────────────────────
describe('monthsActive', () => {
  // Use local-time literals (no "Z") so getMonth() lines up regardless of TZ.
  beforeEach(() => {
    jest.useFakeTimers('modern' as any);
    jest.setSystemTime(new Date(2026, 4, 24, 12, 0, 0).getTime()); // May 24, 2026
  });
  afterEach(() => jest.useRealTimers());

  it('returns 1 for a brand-new user with no first session date', () => {
    expect(monthsActive(null)).toBe(1);
  });

  it('counts the current month for sessions started this month', () => {
    const start = new Date(2026, 4, 1).toISOString(); // May 1 local
    expect(monthsActive(start)).toBe(1);
  });

  it('counts inclusive months across the year boundary', () => {
    // Dec 2025 → May 2026 inclusive = 6 months
    const start = new Date(2025, 11, 1).toISOString(); // Dec 1 local
    expect(monthsActive(start)).toBe(6);
  });

  it('never returns less than 1', () => {
    // First session in the future — still floor to 1
    const start = new Date(2027, 0, 1).toISOString();
    expect(monthsActive(start)).toBe(1);
  });
});

// ── anthropicPnL ──────────────────────────────────────────────────────────────
describe('anthropicPnL', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern' as any);
    jest.setSystemTime(new Date(2026, 4, 24, 12, 0, 0).getTime()); // May 24, 2026
  });
  afterEach(() => jest.useRealTimers());

  const may1 = () => new Date(2026, 4, 1).toISOString();
  const dec1_2025 = () => new Date(2025, 11, 1).toISOString();

  it('returns positive profit when subscription revenue > api cost', () => {
    const result = anthropicPnL(20, 5, may1());
    expect(result).toEqual({
      revenue: 20,
      cost: 5,
      profit: 15,
      months: 1,
    });
  });

  it('returns negative profit when api cost > subscription revenue', () => {
    const result = anthropicPnL(20, 100, may1());
    expect(result.profit).toBe(-80);
  });

  it('multiplies revenue by months when usage spans multiple months', () => {
    // 6 months × $20 = $120 revenue
    const result = anthropicPnL(20, 50, dec1_2025());
    expect(result.revenue).toBe(120);
    expect(result.months).toBe(6);
    expect(result.profit).toBe(70);
  });

  it('handles a null first-session date (treats as 1 month active)', () => {
    const result = anthropicPnL(20, 5, null);
    expect(result.months).toBe(1);
    expect(result.revenue).toBe(20);
  });

  it('handles zero subscription cost', () => {
    const result = anthropicPnL(0, 10, may1());
    expect(result.revenue).toBe(0);
    expect(result.profit).toBe(-10);
  });

  it('handles zero api cost', () => {
    const result = anthropicPnL(20, 0, may1());
    expect(result.profit).toBe(20);
  });
});

// ── getCustomerRating ─────────────────────────────────────────────────────────
describe('getCustomerRating', () => {
  it('returns "Light Sleeper" at very high profit margin', () => {
    expect(getCustomerRating(0.95).label).toBe('Light Sleeper');
  });

  it('returns "Casual User" in upper-comfort margin range', () => {
    expect(getCustomerRating(0.6).label).toBe('Casual User');
  });

  it('returns "Fair Exchange" at moderate positive margin', () => {
    expect(getCustomerRating(0.3).label).toBe('Fair Exchange');
  });

  it('returns "Break-Even" around zero margin', () => {
    expect(getCustomerRating(0).label).toBe('Break-Even');
    expect(getCustomerRating(-0.05).label).toBe('Break-Even');
  });

  it('returns "Power User" at -10% to -50% margin', () => {
    expect(getCustomerRating(-0.3).label).toBe('Power User');
  });

  it('returns "Absolute Unit" at heavy subsidy (< -50%)', () => {
    expect(getCustomerRating(-0.9).label).toBe('Absolute Unit');
    expect(getCustomerRating(-10).label).toBe('Absolute Unit');
  });

  it('handles boundary at exactly 0.8 (falls into Casual User, not Light Sleeper)', () => {
    // Implementation: profitMargin > 0.8 → Light Sleeper
    expect(getCustomerRating(0.8).label).toBe('Casual User');
  });
});

// ── buildSubscriptionTiers ────────────────────────────────────────────────────
describe('buildSubscriptionTiers', () => {
  it('returns three tiers reflecting given costs', () => {
    const tiers = buildSubscriptionTiers({ pro: 20, max5x: 100, max20x: 200 });
    expect(tiers.length).toBe(3);
    expect(tiers[0]).toMatchObject({ label: 'Pro', value: 20 });
    expect(tiers[1]).toMatchObject({ label: 'Max 5×', value: 100 });
    expect(tiers[2]).toMatchObject({ label: 'Max 20×', value: 200 });
  });

  it('uses custom dollar amounts in descriptions', () => {
    const tiers = buildSubscriptionTiers({ pro: 15, max5x: 80, max20x: 180 });
    expect(tiers[0].description).toBe('$15 / mo');
    expect(tiers[1].description).toBe('$80 / mo');
    expect(tiers[2].description).toBe('$180 / mo');
  });
});

// ── load/save pricing settings ────────────────────────────────────────────────
describe('loadPricingSettings / savePricingSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing is stored', () => {
    expect(loadPricingSettings()).toEqual(DEFAULT_PRICING_SETTINGS);
  });

  it('round-trips through localStorage', () => {
    const custom = {
      ...DEFAULT_PRICING_SETTINGS,
      subscriptionTiers: { pro: 25, max5x: 110, max20x: 220 },
    };
    savePricingSettings(custom);
    expect(loadPricingSettings()).toEqual(custom);
  });

  it('deep-merges missing fields with defaults (handles old/partial stored data)', () => {
    // Simulate a stored value missing the haiku tier
    const partial = {
      modelPricing: {
        opus: { input: 4.0, output: 20.0, cacheCreation: 5.0, cacheRead: 0.4 },
      },
      subscriptionTiers: { pro: 25 },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(partial));
    const loaded = loadPricingSettings();

    expect(loaded.modelPricing.opus.input).toBe(4.0);
    // Sonnet/Haiku should fall back to defaults
    expect(loaded.modelPricing.sonnet).toEqual(
      DEFAULT_PRICING_SETTINGS.modelPricing.sonnet
    );
    expect(loaded.modelPricing.haiku).toEqual(
      DEFAULT_PRICING_SETTINGS.modelPricing.haiku
    );
    // pro overridden, max5x/max20x default
    expect(loaded.subscriptionTiers.pro).toBe(25);
    expect(loaded.subscriptionTiers.max5x).toBe(
      DEFAULT_PRICING_SETTINGS.subscriptionTiers.max5x
    );
  });

  it('returns defaults when stored JSON is malformed', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(loadPricingSettings()).toEqual(DEFAULT_PRICING_SETTINGS);
  });
});

// ── default pricing matches Anthropic's current rates ────────────────────────
describe('DEFAULT_PRICING_SETTINGS', () => {
  it('reflects current (May 2026) Opus 4.5+ rates: $5/$25', () => {
    expect(DEFAULT_PRICING_SETTINGS.modelPricing.opus.input).toBe(5.0);
    expect(DEFAULT_PRICING_SETTINGS.modelPricing.opus.output).toBe(25.0);
  });

  it('reflects current Sonnet 4.5/4.6 rates: $3/$15', () => {
    expect(DEFAULT_PRICING_SETTINGS.modelPricing.sonnet.input).toBe(3.0);
    expect(DEFAULT_PRICING_SETTINGS.modelPricing.sonnet.output).toBe(15.0);
  });

  it('reflects current Haiku 4.5 rates: $1/$5', () => {
    expect(DEFAULT_PRICING_SETTINGS.modelPricing.haiku.input).toBe(1.0);
    expect(DEFAULT_PRICING_SETTINGS.modelPricing.haiku.output).toBe(5.0);
  });

  it('keeps cache-write multipliers consistent with the 1.25x rule', () => {
    const { opus, sonnet, haiku } = DEFAULT_PRICING_SETTINGS.modelPricing;
    expect(opus.cacheCreation).toBeCloseTo(opus.input * 1.25, 2);
    expect(sonnet.cacheCreation).toBeCloseTo(sonnet.input * 1.25, 2);
    expect(haiku.cacheCreation).toBeCloseTo(haiku.input * 1.25, 2);
  });

  it('keeps cache-read multipliers consistent with the 0.1x rule', () => {
    const { opus, sonnet, haiku } = DEFAULT_PRICING_SETTINGS.modelPricing;
    expect(opus.cacheRead).toBeCloseTo(opus.input * 0.1, 2);
    expect(sonnet.cacheRead).toBeCloseTo(sonnet.input * 0.1, 2);
    expect(haiku.cacheRead).toBeCloseTo(haiku.input * 0.1, 2);
  });
});
