/**
 * ClaudeWatch — Claude Usage Analytics API Server
 * Reads ~/.claude data files and exposes aggregated usage + cost data.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  MODEL_PRICING,
  getModelTier,
  resolveEffectivePricing,
  computeTokenCost,
  getBillingPeriodStart: getBillingPeriodStartPure,
  extractProjectName: extractProjectNamePure,
} = require('./pricing');

const {
  openDatabase,
  rateAt,
  recordPrice,
  listPriceHistory,
  upsertAggregate,
  queryAggregates,
} = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ── Config ────────────────────────────────────────────────────────────────────
const CLAUDE_DATA_PATH =
  process.env.CLAUDE_DATA_PATH || path.join(os.homedir(), '.claude');
const BILLING_DAY = parseInt(process.env.BILLING_DAY || '30', 10);

// ── Database ──────────────────────────────────────────────────────────────────
const db = openDatabase(CLAUDE_DATA_PATH);

/**
 * Build a per-tier pricing object reflecting the rates effective at the given
 * ISO timestamp. Falls back to current MODEL_PRICING for any (tier, dimension)
 * not yet recorded in price_history.
 */
function pricingAt(isoDate) {
  const tiers = ['opus', 'sonnet', 'haiku'];
  const dims = ['input', 'output', 'cacheCreation', 'cacheRead'];
  const out = {};
  for (const tier of tiers) {
    out[tier] = { ...MODEL_PRICING[tier] };
    for (const dim of dims) {
      out[tier][dim] = rateAt(db, tier, dim, isoDate, MODEL_PRICING[tier][dim]);
    }
  }
  return out;
}

function getBillingPeriodStart(billingDay = BILLING_DAY) {
  return getBillingPeriodStartPure(billingDay, new Date());
}

function readStatsCache() {
  try {
    const p = path.join(CLAUDE_DATA_PATH, 'stats-cache.json');
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Recursively find all .jsonl files under a directory (max depth 4).
 */
function findJsonlFiles(dir, depth = 0) {
  if (depth > 4) return [];
  const files = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findJsonlFiles(full, depth + 1));
      } else if (entry.name.endsWith('.jsonl') && entry.name !== 'history.jsonl') {
        files.push(full);
      }
    }
  } catch {}
  return files;
}

function extractProjectName(filePath) {
  return extractProjectNamePure(filePath, path.sep);
}

/**
 * Parse a single session JSONL file and aggregate token usage.
 * When `collectMessages` is true, also return a per-message timeline
 * (used by the drilldown view).
 */
function parseSession(filePath, { collectMessages = false } = {}) {
  const session = {
    sessionId: path.basename(filePath, '.jsonl'),
    filePath,
    project: extractProjectName(filePath),
    isSubagent: filePath.includes('subagents'),
    timestamp: null,
    lastActivity: null,
    messageCount: 0,
    userMessageCount: 0,
    toolUseCount: 0,
    models: {},
    totalTokens: {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    },
    estimatedCost: 0,
    cwd: null,
    gitBranch: null,
    messages: collectMessages ? [] : undefined,
  };

  try {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);

        if (entry.timestamp) {
          if (!session.timestamp) session.timestamp = entry.timestamp;
          session.lastActivity = entry.timestamp;
        }
        if (entry.cwd && !session.cwd) session.cwd = entry.cwd;
        if (entry.gitBranch && !session.gitBranch) session.gitBranch = entry.gitBranch;

        if (entry.type === 'user' && entry.message) {
          session.userMessageCount++;
          if (collectMessages) {
            const content = entry.message.content;
            let preview = '';
            if (typeof content === 'string') preview = content;
            else if (Array.isArray(content)) {
              for (const block of content) {
                if (block?.type === 'text' && block.text) preview = block.text;
                else if (block?.type === 'tool_result' && typeof block.content === 'string')
                  preview = '[tool_result] ' + block.content;
              }
            }
            session.messages.push({
              role: 'user',
              timestamp: entry.timestamp || null,
              preview: (preview || '').slice(0, 400),
            });
          }
        }

        if (entry.type === 'assistant' && entry.message?.usage) {
          session.messageCount++;
          const u = entry.message.usage;
          const model = entry.message.model || 'unknown';

          if (!session.models[model]) {
            session.models[model] = {
              inputTokens: 0,
              outputTokens: 0,
              cacheReadInputTokens: 0,
              cacheCreationInputTokens: 0,
            };
          }

          const it = u.input_tokens || 0;
          const ot = u.output_tokens || 0;
          const cr = u.cache_read_input_tokens || 0;
          const cc = u.cache_creation_input_tokens || 0;

          session.models[model].inputTokens += it;
          session.models[model].outputTokens += ot;
          session.models[model].cacheReadInputTokens += cr;
          session.models[model].cacheCreationInputTokens += cc;

          session.totalTokens.inputTokens += it;
          session.totalTokens.outputTokens += ot;
          session.totalTokens.cacheReadInputTokens += cr;
          session.totalTokens.cacheCreationInputTokens += cc;

          if (collectMessages) {
            let preview = '';
            let toolUses = 0;
            const content = entry.message.content;
            if (typeof content === 'string') preview = content;
            else if (Array.isArray(content)) {
              for (const block of content) {
                if (block?.type === 'text' && block.text) preview = block.text;
                if (block?.type === 'tool_use') toolUses++;
              }
            }
            session.toolUseCount += toolUses;
            session.messages.push({
              role: 'assistant',
              timestamp: entry.timestamp || null,
              model,
              tokens: { inputTokens: it, outputTokens: ot, cacheReadInputTokens: cr, cacheCreationInputTokens: cc },
              toolUses,
              preview: (preview || '').slice(0, 400),
            });
          }
        }
      } catch {}
    }

    // Compute cost per model
    for (const [model, tokens] of Object.entries(session.models)) {
      session.estimatedCost += computeTokenCost(tokens, model);
    }
  } catch {}

  return session;
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/usage', (req, res) => {
  try {
    // ── Pricing overrides ─────────────────────────────────────────────────────
    let effectivePricing = MODEL_PRICING;
    if (req.query.pricing) {
      try {
        const overrides = JSON.parse(req.query.pricing);
        effectivePricing = resolveEffectivePricing(overrides);
      } catch {
        // malformed JSON — fall back to defaults
      }
    }

    const statsCache = readStatsCache();
    const billingPeriodStart = getBillingPeriodStart();

    // ── Detect missing-data state up front ────────────────────────────────────
    const claudeDirExists = fs.existsSync(CLAUDE_DATA_PATH);
    const projectsPath = path.join(CLAUDE_DATA_PATH, 'projects');
    const projectsExists = fs.existsSync(projectsPath);
    let noDataReason = null;
    if (!claudeDirExists) noDataReason = 'missing-claude-dir';

    // ── Session data ──────────────────────────────────────────────────────────
    const jsonlFiles = projectsExists ? findJsonlFiles(projectsPath) : [];

    const allSessions = jsonlFiles
      .map((f) => parseSession(f))
      .filter((s) => s.messageCount > 0)
      .sort(
        (a, b) =>
          new Date(b.lastActivity || 0).getTime() -
          new Date(a.lastActivity || 0).getTime()
      );

    if (!noDataReason && allSessions.length === 0) {
      noDataReason = statsCache ? 'no-sessions' : 'no-stats-cache';
    }

    // Re-compute session costs using the effective (possibly custom) pricing
    // and persist a per-session-model aggregate row using HISTORICAL pricing.
    for (const session of allSessions) {
      session.estimatedCost = 0;

      // Use the session's last activity to pick historical rates.
      // Falls back to defaults when no history exists.
      const asOf = session.lastActivity || session.timestamp || new Date().toISOString();
      const histPricing = pricingAt(asOf);
      const month = asOf.substring(0, 7); // "2026-05"
      const day = asOf.substring(0, 10);  // "2026-05-25"

      for (const [model, tokens] of Object.entries(session.models)) {
        const liveCost = computeTokenCost(tokens, model, effectivePricing);
        session.estimatedCost += liveCost;

        // Historical cost — what this session would have cost at the
        // rate in effect on its activity date.
        const histCost = computeTokenCost(tokens, model, histPricing);
        const tier = getModelTier(model);

        upsertAggregate(db, {
          sessionId: session.sessionId,
          project: session.project,
          month,
          day,
          tier,
          model,
          messages: session.messageCount,
          inputTokens: tokens.inputTokens || 0,
          outputTokens: tokens.outputTokens || 0,
          cacheReadTokens: tokens.cacheReadInputTokens || 0,
          cacheCreateTokens: tokens.cacheCreationInputTokens || 0,
          apiCost: histCost,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // ── All-time costs from stats-cache (most accurate) ───────────────────────
    const costByModel = {};
    let totalApiCost = 0;

    if (statsCache?.modelUsage) {
      for (const [model, usage] of Object.entries(statsCache.modelUsage)) {
        const tokens = {
          inputTokens: usage.inputTokens || 0,
          outputTokens: usage.outputTokens || 0,
          cacheCreationInputTokens: usage.cacheCreationInputTokens || 0,
          cacheReadInputTokens: usage.cacheReadInputTokens || 0,
        };
        const cost = computeTokenCost(tokens, model, effectivePricing);
        const tier = getModelTier(model);
        costByModel[model] = {
          cost,
          tokens,
          tier,
          displayName: effectivePricing[tier]?.displayName,
          color: effectivePricing[tier]?.color,
        };
        totalApiCost += cost;
      }
    }

    // ── Current billing period costs (from session files) ─────────────────────
    // Includes:
    //   1. Sessions whose last activity falls within the current billing period.
    //   2. Sessions in an active 5h rolling window — these represent
    //      already-incurred costs to Anthropic even if their last activity
    //      timestamp is technically before the period boundary.
    const windowMs = ACTIVE_WINDOW_MS;
    const nowMs = Date.now();

    let currentPeriodCost = 0;
    const currentPeriodTokens = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    };

    for (const session of allSessions) {
      const actDate = session.lastActivity
        ? new Date(session.lastActivity)
        : null;
      const inBillingPeriod = actDate && actDate >= billingPeriodStart;
      const inActiveWindow =
        actDate && nowMs - actDate.getTime() <= windowMs;

      if (inBillingPeriod || inActiveWindow) {
        currentPeriodCost += session.estimatedCost;
        currentPeriodTokens.inputTokens += session.totalTokens.inputTokens;
        currentPeriodTokens.outputTokens += session.totalTokens.outputTokens;
        currentPeriodTokens.cacheReadInputTokens +=
          session.totalTokens.cacheReadInputTokens;
        currentPeriodTokens.cacheCreationInputTokens +=
          session.totalTokens.cacheCreationInputTokens;
      }
    }

    // ── Enrich daily activity with estimated cost ─────────────────────────────
    const dailyModelTokens = statsCache?.dailyModelTokens || [];

    const enrichedDailyActivity = (statsCache?.dailyActivity || []).map(
      (day) => {
        const dayTokenData = dailyModelTokens.find((d) => d.date === day.date);
        let dayCost = 0;
        let dayTotalTokens = 0;

        if (dayTokenData?.tokensByModel) {
          for (const [model, tokenCount] of Object.entries(
            dayTokenData.tokensByModel
          )) {
            dayTotalTokens += tokenCount;
            // Approximate cost: use the model's ratio from the full usage data
            const globalUsage = statsCache?.modelUsage?.[model];
            if (globalUsage) {
              const globalTotal =
                (globalUsage.inputTokens || 0) +
                (globalUsage.outputTokens || 0) +
                (globalUsage.cacheReadInputTokens || 0) +
                (globalUsage.cacheCreationInputTokens || 0);
              if (globalTotal > 0) {
                const ratio = tokenCount / globalTotal;
                dayCost += computeTokenCost(
                  {
                    inputTokens: Math.round(
                      (globalUsage.inputTokens || 0) * ratio
                    ),
                    outputTokens: Math.round(
                      (globalUsage.outputTokens || 0) * ratio
                    ),
                    cacheReadInputTokens: Math.round(
                      (globalUsage.cacheReadInputTokens || 0) * ratio
                    ),
                    cacheCreationInputTokens: Math.round(
                      (globalUsage.cacheCreationInputTokens || 0) * ratio
                    ),
                  },
                  model,
                  effectivePricing
                );
              }
            }
          }
        }

        const dayDate = new Date(day.date + 'T12:00:00Z');
        return {
          ...day,
          totalTokens: dayTotalTokens,
          estimatedCost: dayCost,
          inBillingPeriod: dayDate >= billingPeriodStart,
        };
      }
    );

    // ── Build monthly rollup for the cost comparison chart ────────────────────
    const monthlyRollup = {};
    for (const day of enrichedDailyActivity) {
      const monthKey = day.date.substring(0, 7); // "2026-02"
      if (!monthlyRollup[monthKey]) {
        monthlyRollup[monthKey] = {
          month: monthKey,
          tokens: 0,
          apiCost: 0,
          days: 0,
        };
      }
      monthlyRollup[monthKey].tokens += day.totalTokens || 0;
      monthlyRollup[monthKey].apiCost += day.estimatedCost || 0;
      monthlyRollup[monthKey].days++;
    }

    // ── Total token counts ────────────────────────────────────────────────────
    let totalInputTokens = 0,
      totalOutputTokens = 0,
      totalCacheRead = 0,
      totalCacheCreate = 0;
    if (statsCache?.modelUsage) {
      for (const u of Object.values(statsCache.modelUsage)) {
        totalInputTokens += u.inputTokens || 0;
        totalOutputTokens += u.outputTokens || 0;
        totalCacheRead += u.cacheReadInputTokens || 0;
        totalCacheCreate += u.cacheCreationInputTokens || 0;
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      billingPeriodStart: billingPeriodStart.toISOString(),
      billingDay: BILLING_DAY,
      totalStats: {
        totalMessages: statsCache?.totalMessages || 0,
        totalSessions: statsCache?.totalSessions || 0,
        firstSessionDate: statsCache?.firstSessionDate || null,
        hourCounts: statsCache?.hourCounts || {},
        longestSession: statsCache?.longestSession || null,
        totalInputTokens,
        totalOutputTokens,
        totalCacheRead,
        totalCacheCreate,
        grandTotal:
          totalInputTokens + totalOutputTokens + totalCacheRead + totalCacheCreate,
      },
      computedCosts: {
        totalApiCost,
        byModel: costByModel,
        currentPeriodCost,
        currentPeriodTokens,
      },
      dailyActivity: enrichedDailyActivity,
      monthlyRollup: Object.values(monthlyRollup).sort((a, b) =>
        a.month.localeCompare(b.month)
      ),
      sessions: allSessions.slice(0, 75),
      activeSessions: buildActiveSessions(allSessions),
      modelPricing: effectivePricing,
      claudeDataPath: CLAUDE_DATA_PATH,
      claudeDataAvailable: noDataReason === null,
      noDataReason: noDataReason || undefined,
    });
  } catch (err) {
    console.error('Error building usage response:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get full details for a single session (used by the drilldown modal).
 * The :id is the basename of the .jsonl file (e.g. "abc123").
 */
app.get('/api/sessions/:id', (req, res) => {
  try {
    let effectivePricing = MODEL_PRICING;
    if (req.query.pricing) {
      try {
        effectivePricing = resolveEffectivePricing(JSON.parse(req.query.pricing));
      } catch {}
    }

    const projectsPath = path.join(CLAUDE_DATA_PATH, 'projects');
    const jsonlFiles = findJsonlFiles(projectsPath);
    const target = jsonlFiles.find(
      (f) => path.basename(f, '.jsonl') === req.params.id
    );

    if (!target) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = parseSession(target, { collectMessages: true });
    // Recompute estimatedCost using effective pricing
    session.estimatedCost = 0;
    for (const [model, tokens] of Object.entries(session.models)) {
      session.estimatedCost += computeTokenCost(tokens, model, effectivePricing);
    }
    res.json(session);
  } catch (err) {
    console.error('Error reading session:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Aggregated usage rolled up by project × month × tier.
 * Backed by the SQLite session_aggregates table — populated on every
 * /api/usage call using historical pricing.
 */
app.get('/api/aggregates', (_req, res) => {
  try {
    const result = queryAggregates(db);
    res.json(result);
  } catch (err) {
    console.error('Error reading aggregates:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Price history — list every (tier, dimension, rate, effectiveFrom, source)
 * row from the SQLite price_history table. Powers the historical-rate UI
 * in the Pricing Settings panel.
 */
app.get('/api/price-history', (_req, res) => {
  try {
    res.json({ entries: listPriceHistory(db) });
  } catch (err) {
    console.error('Error reading price history:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Record a price change. Body: { tier, dimension, rate, effectiveFrom, source }.
 * Used when Anthropic updates list rates so historical sessions can be costed
 * at the rate that was active when they ran.
 */
app.post('/api/price-history', (req, res) => {
  const { tier, dimension, rate, effectiveFrom, source } = req.body || {};
  if (
    !['opus', 'sonnet', 'haiku'].includes(tier) ||
    !['input', 'output', 'cacheCreation', 'cacheRead'].includes(dimension) ||
    typeof rate !== 'number' ||
    rate < 0 ||
    !effectiveFrom
  ) {
    return res.status(400).json({ error: 'Invalid price-history entry' });
  }
  try {
    recordPrice(db, {
      tier,
      dimension,
      rate,
      effectiveFrom,
      source: source || 'user-entered',
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error recording price:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Identify currently active (recently used) sessions.
 *
 * Claude Code / Claude.ai operate on a rolling ~5-hour usage window per the
 * /settings/usage page. We can't read that page (auth required), so we
 * approximate: any session with activity in the last 5 hours is "active",
 * and the window ends 5h after its first message in this window.
 *
 * If you'd like a different window length, set CLAUDE_USAGE_WINDOW_HOURS.
 */
const ACTIVE_WINDOW_HOURS = parseFloat(
  process.env.CLAUDE_USAGE_WINDOW_HOURS || '5'
);
const ACTIVE_WINDOW_MS = ACTIVE_WINDOW_HOURS * 60 * 60 * 1000;

function buildActiveSessions(allSessions) {
  const windowHours = ACTIVE_WINDOW_HOURS;
  const windowMs = ACTIVE_WINDOW_MS;
  const now = Date.now();

  const active = [];
  for (const s of allSessions) {
    if (!s.lastActivity) continue;
    const last = new Date(s.lastActivity).getTime();
    if (now - last <= windowMs) {
      const first = s.timestamp
        ? new Date(s.timestamp).getTime()
        : last;
      // Window started at the first message; expires windowMs after that
      const windowEnd = first + windowMs;
      const remainingMs = Math.max(0, windowEnd - now);
      active.push({
        sessionId: s.sessionId,
        project: s.project,
        firstActivity: s.timestamp,
        lastActivity: s.lastActivity,
        minutesSinceLastActivity: Math.floor((now - last) / 60000),
        estimatedCost: s.estimatedCost,
        totalTokens: s.totalTokens,
        messageCount: s.messageCount,
        windowEndsAt: new Date(windowEnd).toISOString(),
        windowRemainingMs: remainingMs,
        windowElapsedMs: Math.max(0, now - first),
        windowHours,
      });
    }
  }
  // Sort: most recently active first
  active.sort((a, b) => a.minutesSinceLastActivity - b.minutesSinceLastActivity);
  return active;
}

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.SERVER_PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`👁  ClaudeWatch API server → http://localhost:${PORT}`);
  console.log(`📁 Claude data path       → ${CLAUDE_DATA_PATH}`);
  console.log(`📅 Billing day of month   → ${BILLING_DAY}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use.`);
    console.error(`   Run: lsof -ti:${PORT} | xargs kill -9`);
    console.error(`   Then restart with: npm start\n`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
