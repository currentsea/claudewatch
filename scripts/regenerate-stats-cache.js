#!/usr/bin/env node
/**
 * Regenerate ~/.claude/stats-cache.json from the session JSONL files on disk.
 *
 * ClaudeWatch only *reads* this cache — it is maintained by Claude Code itself
 * and can go stale (its `lastComputedDate` lags, daily entries are sparse, and
 * its all-time `modelUsage` can badly under-count once it falls behind). This
 * script rebuilds a complete, dashboard-compatible cache from the actual
 * session files, which are the source of truth.
 *
 * It is necessarily bounded by what is still on disk: sessions Claude Code has
 * already cleaned up cannot be recovered, so the regenerated `firstSessionDate`
 * reflects the earliest session that still has a JSONL file.
 *
 * Usage:
 *   node scripts/regenerate-stats-cache.js [--dry-run]
 *
 * Env:
 *   CLAUDE_DATA_PATH   override the ~/.claude location (same var the server uses)
 *
 * A timestamped backup of the existing cache is written next to it before any
 * overwrite. Fields the dashboard does not derive (version, longestSession,
 * totalSpeculationTimeSavedMs) are preserved from the existing cache.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { computeTokenCost } = require('../server/pricing');

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = process.env.CLAUDE_DATA_PATH || path.join(os.homedir(), '.claude');
const PROJECTS = path.join(ROOT, 'projects');
const CACHE_PATH = path.join(ROOT, 'stats-cache.json');

const SUBAGENT_SEGMENT = `${path.sep}subagents${path.sep}`;

/** Recursively collect every session .jsonl (skip history.jsonl). */
function findJsonl(dir, depth = 0) {
  if (depth > 6) return [];
  const out = [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findJsonl(full, depth + 1));
    else if (e.name.endsWith('.jsonl') && e.name !== 'history.jsonl') out.push(full);
  }
  return out;
}

function emptyTokens() {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
  };
}

function main() {
  if (!fs.existsSync(PROJECTS)) {
    console.error(`No projects directory at ${PROJECTS} — nothing to regenerate.`);
    process.exit(1);
  }

  const files = findJsonl(PROJECTS);

  const modelUsage = {};          // model -> token breakdown (real models only)
  const dailyByDate = {};         // date -> { messageCount, toolCallCount, sessions:Set }
  const dailyTokensByDate = {};   // date -> { model -> totalTokens }
  const hourCounts = {};          // hour-of-day -> assistant-message count
  const topLevelSessions = new Set();
  let totalMessages = 0;
  let firstSessionDate = null;

  for (const file of files) {
    const isSubagent = file.includes(SUBAGENT_SEGMENT);
    const sessionId = path.basename(file, '.jsonl');
    let lines;
    try {
      lines = fs.readFileSync(file, 'utf8').split('\n');
    } catch {
      continue;
    }

    let sessionHadMessages = false;

    for (const line of lines) {
      if (!line.trim()) continue;
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      const ts = entry.timestamp || null;
      if (ts && (!firstSessionDate || ts < firstSessionDate)) firstSessionDate = ts;
      const day = ts ? ts.slice(0, 10) : null;

      if (entry.type === 'user' && entry.message) {
        totalMessages++;
        if (day) {
          dailyByDate[day] = dailyByDate[day] || { messageCount: 0, toolCallCount: 0, sessions: new Set() };
          dailyByDate[day].messageCount++;
          if (!isSubagent) dailyByDate[day].sessions.add(sessionId);
        }
      }

      if (entry.type === 'assistant' && entry.message && entry.message.usage) {
        totalMessages++;
        sessionHadMessages = true;
        const model = entry.message.model || 'unknown';
        const u = entry.message.usage;
        const it = u.input_tokens || 0;
        const ot = u.output_tokens || 0;
        const cr = u.cache_read_input_tokens || 0;
        const cc = u.cache_creation_input_tokens || 0;

        // Skip Claude Code's synthetic/internal model (carries no real cost).
        const isSynthetic = model.startsWith('<');
        if (!isSynthetic) {
          const m = (modelUsage[model] = modelUsage[model] || emptyTokens());
          m.inputTokens += it;
          m.outputTokens += ot;
          m.cacheReadInputTokens += cr;
          m.cacheCreationInputTokens += cc;
        }

        let toolUses = 0;
        const content = entry.message.content;
        if (Array.isArray(content)) {
          for (const block of content) if (block && block.type === 'tool_use') toolUses++;
        }

        if (day) {
          dailyByDate[day] = dailyByDate[day] || { messageCount: 0, toolCallCount: 0, sessions: new Set() };
          dailyByDate[day].messageCount++;
          dailyByDate[day].toolCallCount += toolUses;
          if (!isSubagent) dailyByDate[day].sessions.add(sessionId);

          if (!isSynthetic) {
            const dt = (dailyTokensByDate[day] = dailyTokensByDate[day] || {});
            dt[model] = (dt[model] || 0) + it + ot + cr + cc;
          }
        }
        if (ts && !isSynthetic) {
          const hr = String(new Date(ts).getHours());
          hourCounts[hr] = (hourCounts[hr] || 0) + 1;
        }
      }
    }

    if (sessionHadMessages && !isSubagent) topLevelSessions.add(sessionId);
  }

  const dates = Object.keys(dailyByDate).sort();
  const dailyActivity = dates.map((date) => ({
    date,
    messageCount: dailyByDate[date].messageCount,
    sessionCount: dailyByDate[date].sessions.size,
    toolCallCount: dailyByDate[date].toolCallCount,
  }));
  const dailyModelTokens = dates
    .filter((date) => dailyTokensByDate[date])
    .map((date) => ({ date, tokensByModel: dailyTokensByDate[date] }));

  // Match the shape Claude Code writes for each modelUsage entry.
  const modelUsageOut = {};
  let totalCost = 0;
  for (const [model, t] of Object.entries(modelUsage)) {
    modelUsageOut[model] = {
      inputTokens: t.inputTokens,
      outputTokens: t.outputTokens,
      cacheReadInputTokens: t.cacheReadInputTokens,
      cacheCreationInputTokens: t.cacheCreationInputTokens,
      webSearchRequests: 0,
      costUSD: 0,
      contextWindow: 0,
      maxOutputTokens: 0,
    };
    totalCost += computeTokenCost(t, model);
  }

  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    /* first run — no existing cache */
  }

  const regenerated = {
    version: existing.version ?? 1,
    lastComputedDate: new Date().toISOString().slice(0, 10),
    dailyActivity,
    dailyModelTokens,
    modelUsage: modelUsageOut,
    totalSessions: topLevelSessions.size,
    totalMessages,
    longestSession: existing.longestSession ?? null,
    firstSessionDate,
    hourCounts,
    totalSpeculationTimeSavedMs: existing.totalSpeculationTimeSavedMs ?? 0,
  };

  // ── Report ────────────────────────────────────────────────────────────────
  let existingCost = 0;
  for (const [m, t] of Object.entries(existing.modelUsage || {})) existingCost += computeTokenCost(t, m);
  console.log(`Scanned ${files.length} session files under ${PROJECTS}`);
  console.log(`  first session : ${existing.firstSessionDate || '—'}  ->  ${firstSessionDate}`);
  console.log(`  active days   : ${(existing.dailyActivity || []).length}  ->  ${dailyActivity.length}`);
  console.log(`  sessions      : ${existing.totalSessions ?? '—'}  ->  ${regenerated.totalSessions}`);
  console.log(`  messages      : ${existing.totalMessages ?? '—'}  ->  ${totalMessages}`);
  console.log(`  API-equiv cost: $${existingCost.toFixed(2)}  ->  $${totalCost.toFixed(2)}`);
  console.log('  models        :');
  for (const [m, t] of Object.entries(modelUsage)) {
    console.log(`     ${m.padEnd(32)} $${computeTokenCost(t, m).toFixed(2)}`);
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: no files written.');
    return;
  }

  if (fs.existsSync(CACHE_PATH)) {
    const backup = `${CACHE_PATH}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    fs.copyFileSync(CACHE_PATH, backup);
    console.log(`\nBacked up existing cache -> ${backup}`);
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(regenerated, null, 2));
  console.log(`Wrote regenerated cache  -> ${CACHE_PATH}`);
}

main();
