/**
 * Pure helpers for server-side cost/billing math.  Extracted from index.js so
 * they can be exercised in unit tests without spinning up Express or touching
 * the filesystem.
 *
 * Mirrors `src/utils/pricing.ts` defaults — both must stay in sync.
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
  const tier = getModelTier(modelId);
  const p = (pricing || MODEL_PRICING)[tier];
  const M = 1_000_000;
  return (
    ((tokens.inputTokens || 0) / M) * p.input +
    ((tokens.outputTokens || 0) / M) * p.output +
    ((tokens.cacheCreationInputTokens || 0) / M) * p.cacheCreation +
    ((tokens.cacheReadInputTokens || 0) / M) * p.cacheRead
  );
}

function getBillingPeriodStart(billingDay = 1, now = new Date()) {
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

module.exports = {
  MODEL_PRICING,
  getModelTier,
  resolveEffectivePricing,
  computeTokenCost,
  getBillingPeriodStart,
  extractProjectName,
};
