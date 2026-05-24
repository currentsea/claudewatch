/**
 * BurnItDown — Claude Usage Analytics API Server
 * Reads ~/.claude data files and exposes aggregated usage + cost data.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

// ── Config ────────────────────────────────────────────────────────────────────
const CLAUDE_DATA_PATH =
  process.env.CLAUDE_DATA_PATH || path.join(os.homedir(), '.claude');
const BILLING_DAY = parseInt(process.env.BILLING_DAY || '1', 10);

// ── Model Pricing (USD per 1M tokens) ─────────────────────────────────────────
// Prices as of 2025 — update these if Anthropic changes rates.
const MODEL_PRICING = {
  opus: {
    displayName: 'Claude Opus',
    color: '#a855f7',
    input: 15.0,
    output: 75.0,
    cacheCreation: 18.75,
    cacheRead: 1.5,
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
    input: 0.8,
    output: 4.0,
    cacheCreation: 1.0,
    cacheRead: 0.08,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getModelTier(modelId) {
  const id = (modelId || '').toLowerCase();
  if (id.includes('opus')) return 'opus';
  if (id.includes('haiku')) return 'haiku';
  return 'sonnet';
}

function computeTokenCost(tokens, modelId) {
  const tier = getModelTier(modelId);
  const p = MODEL_PRICING[tier];
  const M = 1_000_000;
  return (
    ((tokens.inputTokens || 0) / M) * p.input +
    ((tokens.outputTokens || 0) / M) * p.output +
    ((tokens.cacheCreationInputTokens || 0) / M) * p.cacheCreation +
    ((tokens.cacheReadInputTokens || 0) / M) * p.cacheRead
  );
}

function getBillingPeriodStart(billingDay = BILLING_DAY) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  if (day >= billingDay) {
    return new Date(year, month, billingDay);
  }
  return new Date(year, month - 1, billingDay);
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

/**
 * Extract a human-readable project name from the file path.
 * ~/.claude/projects/-Users-jbull-WebstormProjects-foo/session.jsonl
 * → WebstormProjects/foo
 */
function extractProjectName(filePath) {
  const parts = filePath.split(path.sep);
  const projectsIdx = parts.lastIndexOf('projects');
  if (projectsIdx >= 0 && parts[projectsIdx + 1]) {
    const slug = parts[projectsIdx + 1];
    // Strip leading -Users-<name>- prefix
    const cleaned = slug.replace(/^-[Uu]sers-[^-]+-/, '').replace(/-/g, '/');
    return cleaned || slug;
  }
  return 'unknown';
}

/**
 * Parse a single session JSONL file and aggregate token usage.
 */
function parseSession(filePath) {
  const session = {
    sessionId: path.basename(filePath, '.jsonl'),
    filePath,
    project: extractProjectName(filePath),
    isSubagent: filePath.includes('subagents'),
    timestamp: null,
    lastActivity: null,
    messageCount: 0,
    models: {},
    totalTokens: {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    },
    estimatedCost: 0,
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

app.get('/api/usage', (_req, res) => {
  try {
    const statsCache = readStatsCache();
    const billingPeriodStart = getBillingPeriodStart();

    // ── Session data ──────────────────────────────────────────────────────────
    const projectsPath = path.join(CLAUDE_DATA_PATH, 'projects');
    const jsonlFiles = findJsonlFiles(projectsPath);

    const allSessions = jsonlFiles
      .map(parseSession)
      .filter((s) => s.messageCount > 0)
      .sort(
        (a, b) =>
          new Date(b.lastActivity || 0).getTime() -
          new Date(a.lastActivity || 0).getTime()
      );

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
        const cost = computeTokenCost(tokens, model);
        const tier = getModelTier(model);
        costByModel[model] = {
          cost,
          tokens,
          tier,
          displayName: MODEL_PRICING[tier]?.displayName,
          color: MODEL_PRICING[tier]?.color,
        };
        totalApiCost += cost;
      }
    }

    // ── Current billing period costs (from session files) ─────────────────────
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
      if (actDate && actDate >= billingPeriodStart) {
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
                  model
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
      modelPricing: MODEL_PRICING,
    });
  } catch (err) {
    console.error('Error building usage response:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.SERVER_PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`🔥 BurnItDown API server → http://localhost:${PORT}`);
  console.log(`📁 Claude data path      → ${CLAUDE_DATA_PATH}`);
  console.log(`📅 Billing day of month  → ${BILLING_DAY}`);
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
