const {
  MODEL_PRICING,
  getModelTier,
  resolveEffectivePricing,
  computeTokenCost,
  getBillingPeriodStart,
  extractProjectName,
  DEMO_CUTOFF_DAY,
  isBeforeDemoCutoff,
  aggregateModelUsage,
} = require('./pricing');

// ── getModelTier ──────────────────────────────────────────────────────────────
describe('getModelTier', () => {
  it('maps any "opus"-containing model id to opus tier', () => {
    expect(getModelTier('claude-opus-4-7')).toBe('opus');
    expect(getModelTier('CLAUDE-OPUS-4-1')).toBe('opus');
    expect(getModelTier('claude-3-opus-20240229')).toBe('opus');
  });

  it('maps any "haiku"-containing model id to haiku tier', () => {
    expect(getModelTier('claude-haiku-4-5')).toBe('haiku');
    expect(getModelTier('Claude-Haiku-3.5')).toBe('haiku');
  });

  it('defaults unknown / non-matching model ids to sonnet', () => {
    expect(getModelTier('claude-sonnet-4-6')).toBe('sonnet');
    expect(getModelTier('some-future-model')).toBe('sonnet');
    expect(getModelTier('')).toBe('sonnet');
    expect(getModelTier(null)).toBe('sonnet');
    expect(getModelTier(undefined)).toBe('sonnet');
  });
});

// ── resolveEffectivePricing ───────────────────────────────────────────────────
describe('resolveEffectivePricing', () => {
  it('returns the canonical pricing object when no overrides given', () => {
    expect(resolveEffectivePricing(null)).toBe(MODEL_PRICING);
    expect(resolveEffectivePricing(undefined)).toBe(MODEL_PRICING);
  });

  it('merges per-tier overrides on top of defaults', () => {
    const result = resolveEffectivePricing({
      opus: { input: 100, output: 200 },
    });
    expect(result.opus.input).toBe(100);
    expect(result.opus.output).toBe(200);
    // Cache fields and other tiers should be untouched
    expect(result.opus.cacheCreation).toBe(MODEL_PRICING.opus.cacheCreation);
    expect(result.sonnet).toEqual(MODEL_PRICING.sonnet);
    expect(result.haiku).toEqual(MODEL_PRICING.haiku);
  });

  it('preserves the display name & color from defaults even with overrides', () => {
    const result = resolveEffectivePricing({
      opus: { input: 1 },
    });
    expect(result.opus.displayName).toBe('Claude Opus');
    expect(result.opus.color).toBe('#a855f7');
  });

  it('ignores tier keys that are not opus/sonnet/haiku', () => {
    const result = resolveEffectivePricing({
      banana: { input: 9999 },
    });
    expect(result.banana).toBeUndefined();
  });
});

// ── computeTokenCost ──────────────────────────────────────────────────────────
describe('computeTokenCost', () => {
  it('multiplies each token bucket by its per-MTok rate', () => {
    // Opus: $5 input, $25 output, $6.25 cache-write, $0.5 cache-read
    const tokens = {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheCreationInputTokens: 1_000_000,
      cacheReadInputTokens: 1_000_000,
    };
    const cost = computeTokenCost(tokens, 'claude-opus-4-7');
    expect(cost).toBeCloseTo(5 + 25 + 6.25 + 0.5, 4);
  });

  it('returns 0 for empty token counts', () => {
    const cost = computeTokenCost(
      {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      },
      'claude-sonnet-4-6'
    );
    expect(cost).toBe(0);
  });

  it('uses the supplied pricing override when given', () => {
    const override = resolveEffectivePricing({
      opus: { input: 10, output: 50, cacheCreation: 12.5, cacheRead: 1 },
    });
    const cost = computeTokenCost(
      { inputTokens: 1_000_000, outputTokens: 0 },
      'claude-opus-4-7',
      override
    );
    expect(cost).toBeCloseTo(10, 4);
  });

  it('gracefully tolerates missing token-bucket keys', () => {
    const cost = computeTokenCost({ inputTokens: 1_000_000 }, 'claude-opus');
    expect(cost).toBeCloseTo(5, 4);
  });

  it('uses sonnet rates for unknown model ids', () => {
    // 1M output tokens at sonnet's $15
    const cost = computeTokenCost(
      { outputTokens: 1_000_000 },
      'unknown-model'
    );
    expect(cost).toBeCloseTo(15, 4);
  });

  it('opus is roughly 5x sonnet output cost for the same usage', () => {
    const tokens = { outputTokens: 1_000_000 };
    const opusCost = computeTokenCost(tokens, 'opus');
    const sonnetCost = computeTokenCost(tokens, 'sonnet');
    expect(opusCost / sonnetCost).toBeCloseTo(25 / 15, 2);
  });
});

// ── getBillingPeriodStart ─────────────────────────────────────────────────────
describe('getBillingPeriodStart', () => {
  it('returns the day-of-month in the current month when today >= billingDay', () => {
    const now = new Date(2026, 4, 15); // May 15, 2026
    const start = getBillingPeriodStart(1, now);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(4); // May
    expect(start.getFullYear()).toBe(2026);
  });

  it('returns the previous month when today < billingDay', () => {
    const now = new Date(2026, 4, 5); // May 5
    const start = getBillingPeriodStart(15, now);
    expect(start.getDate()).toBe(15);
    expect(start.getMonth()).toBe(3); // April
  });

  it('handles a billing day equal to today exactly (uses current month)', () => {
    const now = new Date(2026, 4, 15);
    const start = getBillingPeriodStart(15, now);
    expect(start.getMonth()).toBe(4);
  });

  it('rolls back across the year boundary correctly', () => {
    const now = new Date(2026, 0, 5); // Jan 5
    const start = getBillingPeriodStart(20, now);
    // JS Date normalises new Date(2026, -1, 20) → Dec 20, 2025
    expect(start.getMonth()).toBe(11);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getDate()).toBe(20);
  });
});

// ── extractProjectName ────────────────────────────────────────────────────────
describe('extractProjectName', () => {
  it('strips the -Users-<name>- prefix and de-dashes the slug', () => {
    const result = extractProjectName(
      '/Users/jbull/.claude/projects/-Users-jbull-WebstormProjects-burnitdown/abc.jsonl'
    );
    expect(result).toBe('WebstormProjects/burnitdown');
  });

  it('handles case-insensitive Users prefix', () => {
    const result = extractProjectName(
      '/home/x/.claude/projects/-users-alex-projects-foo/abc.jsonl'
    );
    expect(result).toBe('projects/foo');
  });

  it('returns "unknown" when no projects/ segment exists', () => {
    expect(extractProjectName('/tmp/random/file.jsonl')).toBe('unknown');
  });

  it('falls back to the raw slug when nothing matches the strip pattern', () => {
    const result = extractProjectName('/x/projects/just-a-slug/abc.jsonl');
    expect(result).toBe('just/a/slug');
  });
});

// ── pricing sanity (defaults are aligned with current Anthropic rates) ────────
describe('MODEL_PRICING (defaults)', () => {
  it('Opus 4.5+ rates: $5 input / $25 output', () => {
    expect(MODEL_PRICING.opus.input).toBe(5);
    expect(MODEL_PRICING.opus.output).toBe(25);
  });

  it('Sonnet 4.5/4.6 rates: $3 input / $15 output', () => {
    expect(MODEL_PRICING.sonnet.input).toBe(3);
    expect(MODEL_PRICING.sonnet.output).toBe(15);
  });

  it('Haiku 4.5 rates: $1 input / $5 output', () => {
    expect(MODEL_PRICING.haiku.input).toBe(1);
    expect(MODEL_PRICING.haiku.output).toBe(5);
  });

  it('cache-write rates are 1.25× input for every tier', () => {
    for (const tier of ['opus', 'sonnet', 'haiku']) {
      const p = MODEL_PRICING[tier];
      expect(p.cacheCreation).toBeCloseTo(p.input * 1.25, 4);
    }
  });

  it('cache-read rates are 0.1× input for every tier', () => {
    for (const tier of ['opus', 'sonnet', 'haiku']) {
      const p = MODEL_PRICING[tier];
      expect(p.cacheRead).toBeCloseTo(p.input * 0.1, 4);
    }
  });
});

// ── demo mode: isBeforeDemoCutoff ─────────────────────────────────────────────
describe('isBeforeDemoCutoff', () => {
  it('uses the hardcoded 2026-05-30 cutoff by default', () => {
    expect(DEMO_CUTOFF_DAY).toBe('2026-05-30');
  });

  it('treats timestamps before the cutoff day as "before"', () => {
    expect(isBeforeDemoCutoff('2026-05-29T23:59:59.999Z')).toBe(true);
    expect(isBeforeDemoCutoff('2026-02-01T07:11:20.619Z')).toBe(true);
    expect(isBeforeDemoCutoff('2025-12-31T00:00:00.000Z')).toBe(true);
  });

  it('keeps the cutoff day itself and anything after it', () => {
    expect(isBeforeDemoCutoff('2026-05-30T00:00:00.000Z')).toBe(false);
    expect(isBeforeDemoCutoff('2026-05-31T01:53:11.460Z')).toBe(false);
    expect(isBeforeDemoCutoff('2026-06-01T00:00:00.000Z')).toBe(false);
  });

  it('treats missing/empty timestamps as before the cutoff (filtered out)', () => {
    expect(isBeforeDemoCutoff(null)).toBe(true);
    expect(isBeforeDemoCutoff(undefined)).toBe(true);
    expect(isBeforeDemoCutoff('')).toBe(true);
  });

  it('honours a custom cutoff day argument', () => {
    expect(isBeforeDemoCutoff('2026-05-23T00:00:00Z', '2026-05-24')).toBe(true);
    expect(isBeforeDemoCutoff('2026-05-24T00:00:00Z', '2026-05-24')).toBe(false);
  });
});

// ── demo mode: aggregateModelUsage ────────────────────────────────────────────
describe('aggregateModelUsage', () => {
  const sessions = [
    {
      models: {
        'claude-opus-4-8': {
          inputTokens: 100,
          outputTokens: 10,
          cacheReadInputTokens: 1000,
          cacheCreationInputTokens: 50,
        },
      },
    },
    {
      models: {
        'claude-opus-4-8': {
          inputTokens: 200,
          outputTokens: 20,
          cacheReadInputTokens: 2000,
          cacheCreationInputTokens: 100,
        },
        'claude-sonnet-4-6': {
          inputTokens: 5,
          outputTokens: 5,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
        },
      },
    },
  ];

  it('sums per-model token buckets across sessions', () => {
    const usage = aggregateModelUsage(sessions);
    expect(usage['claude-opus-4-8']).toEqual({
      inputTokens: 300,
      outputTokens: 30,
      cacheReadInputTokens: 3000,
      cacheCreationInputTokens: 150,
    });
    expect(usage['claude-sonnet-4-6'].inputTokens).toBe(5);
  });

  it('skips Claude Code\'s synthetic internal model', () => {
    const usage = aggregateModelUsage([
      { models: { '<synthetic>': { inputTokens: 999, outputTokens: 999 } } },
    ]);
    expect(usage['<synthetic>']).toBeUndefined();
    expect(Object.keys(usage)).toHaveLength(0);
  });

  it('returns an empty object for no sessions', () => {
    expect(aggregateModelUsage([])).toEqual({});
    expect(aggregateModelUsage(null)).toEqual({});
  });
});
