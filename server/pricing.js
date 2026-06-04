/**
 * Pure helpers for server-side cost/billing math.  Extracted from index.js so
 * they can be exercised in unit tests without spinning up Express or touching
 * the filesystem.
 *
 * Mirrors `src/utils/pricing.ts` defaults — both must stay in sync.
 * Latest models: Opus 4.8 (most capable), Sonnet 4.6 (balanced), Haiku 4.5 (fastest).
 * Source: https://docs.anthropic.com/en/docs/about-claude/pricing (May 2026)
 */

const MODEL_PRICING = {
  opus: {
    displayName: 'Claude Opus',
    color: '#a855f7',
    input: 5.0,
    output: 25.0,
    cacheCreation: 6.25,
    cacheRead: 0.5,
  },
  sonnet: {
    displayName: 'Claude Sonnet',
    color: '#6366f1',
    input: 3.0,
    output: 15.0,
    cacheCreation: 3.75,
    cacheRead: 0.3,
  },
  haiku: {
    displayName: 'Claude Haiku',
    color: '#22d3ee',
    input: 1.0,
    output: 5.0,
    cacheCreation: 1.25,
    cacheRead: 0.1,
  },
};

function getModelTier(modelId) {
  const id = (modelId || '').toLowerCase();
  if (id.includes('opus')) return 'opus';
  if (id.includes('haiku')) return 'haiku';
  return 'sonnet';
}

function resolveEffectivePricing(overrides) {
  if (!overrides) return MODEL_PRICING;
  const result = {};
  for (const tier of ['opus', 'sonnet', 'haiku']) {
    result[tier] = { ...MODEL_PRICING[tier], ...(overrides[tier] || {}) };
  }
  return result;
}

function computeTokenCost(tokens, modelId, pricing) {
  if (!tokens || typeof tokens !== 'object') return 0;
  const tier = getModelTier(modelId);
  const p = (pricing || MODEL_PRICING)[tier];
  if (!p) return 0; // unknown tier / malformed override — never NaN-poison totals
  const M = 1_000_000;
  // Clamp each bucket to a finite, non-negative count so a bad value can't
  // produce a negative or NaN cost that silently corrupts downstream sums.
  const nn = (n) => (Number.isFinite(n) && n > 0 ? n : 0);
  return (
    (nn(tokens.inputTokens) / M) * p.input +
    (nn(tokens.outputTokens) / M) * p.output +
    (nn(tokens.cacheCreationInputTokens) / M) * p.cacheCreation +
    (nn(tokens.cacheReadInputTokens) / M) * p.cacheRead
  );
}

function getBillingPeriodStart(billingDay = 30, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  if (day >= billingDay) {
    return new Date(year, month, billingDay);
  }
  return new Date(year, month - 1, billingDay);
}

function extractProjectName(filePath, sep = '/') {
  const parts = filePath.split(sep);
  const projectsIdx = parts.lastIndexOf('projects');
  if (projectsIdx >= 0 && parts[projectsIdx + 1]) {
    const slug = parts[projectsIdx + 1];
    const cleaned = slug.replace(/^-[Uu]sers-[^-]+-/, '').replace(/-/g, '/');
    return cleaned || slug;
  }
  return 'unknown';
}

// ── Demo mode ──────────────────────────────────────────────────────────────────
// When IS_DEMO_MODE_JB_ENABLED is on (the repository default — see .env), the
// dashboard ignores all sessions and statistics dated before this day. The
// cutoff is hardcoded by request. 2026-05-30 is also the billing-period start,
// so in practice the demo is scoped to the current billing cycle onward.
const DEMO_CUTOFF_DAY = '2026-05-30';

/**
 * True when an ISO timestamp falls before the demo cutoff day (missing dates
 * are treated as "before" so they get filtered out). Compares the YYYY-MM-DD
 * prefix, so it is timezone-agnostic and matches the cache's day strings.
 */
function isBeforeDemoCutoff(isoDate, cutoffDay = DEMO_CUTOFF_DAY) {
  if (!isoDate) return true;
  return String(isoDate).slice(0, 10) < cutoffDay;
}

/**
 * Sum per-model token usage across parsed sessions, producing the same shape
 * the dashboard reads from stats-cache `modelUsage`. Claude Code's synthetic
 * internal model (id starting with "<") carries no real cost and is skipped.
 * Used to rebuild all-time totals from a date-filtered session set in demo mode.
 */
function aggregateModelUsage(sessions) {
  const usage = {};
  for (const s of sessions || []) {
    for (const [model, t] of Object.entries((s && s.models) || {})) {
      if (model.startsWith('<')) continue;
      const m = (usage[model] = usage[model] || {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      });
      m.inputTokens += t.inputTokens || 0;
      m.outputTokens += t.outputTokens || 0;
      m.cacheReadInputTokens += t.cacheReadInputTokens || 0;
      m.cacheCreationInputTokens += t.cacheCreationInputTokens || 0;
    }
  }
  return usage;
}

module.exports = {
  MODEL_PRICING,
  getModelTier,
  resolveEffectivePricing,
  computeTokenCost,
  getBillingPeriodStart,
  extractProjectName,
  DEMO_CUTOFF_DAY,
  isBeforeDemoCutoff,
  aggregateModelUsage,
};
