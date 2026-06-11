/**
 * ClaudeWatch — SQLite-backed aggregation + price-history store.
 *
 * Lives at $CLAUDE_DATA_PATH/claudewatch.sqlite (so it travels with the user's
 * data dir). All schema is created idempotently on startup.
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const SCHEMA_VERSION = 2;

/**
 * Initialise (or open) the database. Creates parent dir if missing.
 * Returns a connection plus prepared helper functions.
 */
function openDatabase(dataPath) {
  if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
  const file = path.join(dataPath, 'claudewatch.sqlite');
  // One-time migration from legacy burnitdown.sqlite if present
  const legacy = path.join(dataPath, 'burnitdown.sqlite');
  if (!fs.existsSync(file) && fs.existsSync(legacy)) {
    fs.renameSync(legacy, file);
    for (const ext of ['-shm', '-wal']) {
      if (fs.existsSync(legacy + ext)) fs.renameSync(legacy + ext, file + ext);
    }
  }
  const db = new Database(file);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  migrate(db);
  seedPriceHistoryIfEmpty(db);
  ensureFableSeeded(db);

  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tier TEXT NOT NULL CHECK (tier IN ('opus', 'sonnet', 'haiku', 'fable')),
      dimension TEXT NOT NULL CHECK (dimension IN ('input', 'output', 'cacheCreation', 'cacheRead')),
      rate REAL NOT NULL,
      effective_from TEXT NOT NULL,
      source TEXT NOT NULL,
      UNIQUE (tier, dimension, effective_from)
    );

    CREATE INDEX IF NOT EXISTS idx_price_history_lookup
      ON price_history (tier, dimension, effective_from);

    CREATE TABLE IF NOT EXISTS session_aggregates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      project TEXT NOT NULL,
      month TEXT NOT NULL,
      day TEXT NOT NULL,
      tier TEXT NOT NULL,
      model TEXT NOT NULL,
      messages INTEGER NOT NULL DEFAULT 0,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cache_create_tokens INTEGER NOT NULL DEFAULT 0,
      api_cost REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      UNIQUE (session_id, model)
    );

    CREATE INDEX IF NOT EXISTS idx_aggregates_project_month
      ON session_aggregates (project, month);
    CREATE INDEX IF NOT EXISTS idx_aggregates_tier
      ON session_aggregates (tier);
  `);

  const row = db
    .prepare('SELECT value FROM schema_meta WHERE key = ?')
    .get('schema_version');
  if (!row) {
    // Fresh database — the CREATE TABLE above already used the v2 schema.
    db.prepare(
      'INSERT INTO schema_meta (key, value) VALUES (?, ?)'
    ).run('schema_version', String(SCHEMA_VERSION));
    return;
  }

  const version = parseInt(row.value, 10) || 1;
  if (version < 2) {
    // v2: price_history's tier CHECK gains 'fable' (Claude Fable 5 / Mythos 5).
    // SQLite cannot alter a CHECK constraint, so rebuild the table in place.
    // RENAME carries the old index along; DROP TABLE removes it, then the
    // index is recreated against the rebuilt table.
    db.exec(`
      BEGIN;
      ALTER TABLE price_history RENAME TO price_history_v1;
      CREATE TABLE price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tier TEXT NOT NULL CHECK (tier IN ('opus', 'sonnet', 'haiku', 'fable')),
        dimension TEXT NOT NULL CHECK (dimension IN ('input', 'output', 'cacheCreation', 'cacheRead')),
        rate REAL NOT NULL,
        effective_from TEXT NOT NULL,
        source TEXT NOT NULL,
        UNIQUE (tier, dimension, effective_from)
      );
      INSERT INTO price_history SELECT * FROM price_history_v1;
      DROP TABLE price_history_v1;
      CREATE INDEX IF NOT EXISTS idx_price_history_lookup
        ON price_history (tier, dimension, effective_from);
      COMMIT;
    `);
    db.prepare('UPDATE schema_meta SET value = ? WHERE key = ?').run(
      String(SCHEMA_VERSION),
      'schema_version'
    );
  }
}

// Claude Fable 5 / Mythos 5 launched June 2026 at $10/$50 per MTok.
// Effective-from predates any possible fable-tier session, and rateAt falls
// back to MODEL_PRICING (the same rates) for timestamps before it anyway.
const FABLE_SEED_DATE = '2026-06-01T00:00:00Z';
const FABLE_SOURCE = 'platform.claude.com/docs/en/about-claude/models/overview';

/**
 * Seed price_history with the current default rates if the table is empty.
 * Effective-from date: 2026-01-01 (matches the May 2026 documented defaults
 * in utils/pricing.ts). Source citation is recorded so the UI can attribute.
 */
function seedPriceHistoryIfEmpty(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM price_history').get();
  if (count.n > 0) return;

  const insert = db.prepare(`
    INSERT INTO price_history (tier, dimension, rate, effective_from, source)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Defaults match utils/pricing.ts DEFAULT_PRICING_SETTINGS.
  // Source: https://docs.anthropic.com/en/docs/about-claude/pricing (May 2026)
  const SOURCE = 'docs.anthropic.com/en/docs/about-claude/pricing';
  const SEED_DATE = '2026-01-01T00:00:00Z';

  const seed = [
    ['fable',  'input',          10.0, FABLE_SEED_DATE, FABLE_SOURCE],
    ['fable',  'output',         50.0, FABLE_SEED_DATE, FABLE_SOURCE],
    ['fable',  'cacheCreation',  12.5, FABLE_SEED_DATE, FABLE_SOURCE],
    ['fable',  'cacheRead',      1.0,  FABLE_SEED_DATE, FABLE_SOURCE],
    ['opus',   'input',          5.0,  SEED_DATE, SOURCE],
    ['opus',   'output',         25.0, SEED_DATE, SOURCE],
    ['opus',   'cacheCreation',  6.25, SEED_DATE, SOURCE],
    ['opus',   'cacheRead',      0.5,  SEED_DATE, SOURCE],
    ['sonnet', 'input',          3.0,  SEED_DATE, SOURCE],
    ['sonnet', 'output',         15.0, SEED_DATE, SOURCE],
    ['sonnet', 'cacheCreation',  3.75, SEED_DATE, SOURCE],
    ['sonnet', 'cacheRead',      0.3,  SEED_DATE, SOURCE],
    ['haiku',  'input',          1.0,  SEED_DATE, SOURCE],
    ['haiku',  'output',         5.0,  SEED_DATE, SOURCE],
    ['haiku',  'cacheCreation',  1.25, SEED_DATE, SOURCE],
    ['haiku',  'cacheRead',      0.1,  SEED_DATE, SOURCE],
  ];

  const tx = db.transaction((rows) => {
    for (const r of rows) insert.run(...r);
  });
  tx(seed);
}

/**
 * Backfill the fable tier into databases seeded before schema v2. Idempotent —
 * INSERT OR IGNORE on the (tier, dimension, effective_from) unique key, so
 * user-recorded fable rates are never overwritten.
 */
function ensureFableSeeded(db) {
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM price_history WHERE tier = 'fable'")
    .get();
  if (count.n > 0) return;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO price_history (tier, dimension, rate, effective_from, source)
    VALUES (?, ?, ?, ?, ?)
  `);
  const rows = [
    ['fable', 'input',         10.0, FABLE_SEED_DATE, FABLE_SOURCE],
    ['fable', 'output',        50.0, FABLE_SEED_DATE, FABLE_SOURCE],
    ['fable', 'cacheCreation', 12.5, FABLE_SEED_DATE, FABLE_SOURCE],
    ['fable', 'cacheRead',     1.0,  FABLE_SEED_DATE, FABLE_SOURCE],
  ];
  const tx = db.transaction((rs) => {
    for (const r of rs) insert.run(...r);
  });
  tx(rows);
}

/**
 * Look up the rate effective at the given ISO timestamp.
 * Returns the rate from the most-recent price_history row with
 * effective_from <= asOfIso. Falls back to fallbackRate if no history exists.
 */
function rateAt(db, tier, dimension, asOfIso, fallbackRate) {
  const row = db
    .prepare(
      `
      SELECT rate FROM price_history
      WHERE tier = ? AND dimension = ? AND effective_from <= ?
      ORDER BY effective_from DESC
      LIMIT 1
    `
    )
    .get(tier, dimension, asOfIso);
  return row ? row.rate : fallbackRate;
}

/**
 * Record a new price point. Idempotent on (tier, dimension, effective_from).
 */
function recordPrice(db, { tier, dimension, rate, effectiveFrom, source }) {
  db.prepare(
    `
    INSERT OR REPLACE INTO price_history (tier, dimension, rate, effective_from, source)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(tier, dimension, rate, effectiveFrom, source);
}

function listPriceHistory(db) {
  return db
    .prepare(
      `
      SELECT tier, dimension, rate, effective_from AS effectiveFrom, source
      FROM price_history
      ORDER BY effective_from DESC, tier, dimension
    `
    )
    .all();
}

/**
 * Upsert a session-model aggregate row. Called once per session-model after
 * each parse. We compute api_cost using historical rates when available.
 */
function upsertAggregate(db, row) {
  db.prepare(
    `
    INSERT INTO session_aggregates (
      session_id, project, month, day, tier, model,
      messages, input_tokens, output_tokens,
      cache_read_tokens, cache_create_tokens, api_cost, updated_at
    ) VALUES (
      @sessionId, @project, @month, @day, @tier, @model,
      @messages, @inputTokens, @outputTokens,
      @cacheReadTokens, @cacheCreateTokens, @apiCost, @updatedAt
    )
    ON CONFLICT(session_id, model) DO UPDATE SET
      project = excluded.project,
      month = excluded.month,
      day = excluded.day,
      tier = excluded.tier,
      messages = excluded.messages,
      input_tokens = excluded.input_tokens,
      output_tokens = excluded.output_tokens,
      cache_read_tokens = excluded.cache_read_tokens,
      cache_create_tokens = excluded.cache_create_tokens,
      api_cost = excluded.api_cost,
      updated_at = excluded.updated_at
  `
  ).run(row);
}

/**
 * Aggregate by (project, month, tier). Returns rows ready for the subdashboard.
 *
 * When `sinceDay` (a "YYYY-MM-DD" string) is provided, rows dated before that
 * day are excluded — used by demo mode to honor the hardcoded cutoff even
 * though the rollup itself is monthly (the underlying rows store a day).
 */
function queryAggregates(db, { groupBy = 'month', sinceDay = null } = {}) {
  const where = sinceDay ? 'WHERE day >= @sinceDay' : '';
  const rows = db
    .prepare(
      `
      SELECT
        project,
        month,
        tier,
        COUNT(DISTINCT session_id) AS sessions,
        SUM(messages) AS messages,
        SUM(input_tokens) AS inputTokens,
        SUM(output_tokens) AS outputTokens,
        SUM(cache_read_tokens) AS cacheReadInputTokens,
        SUM(cache_create_tokens) AS cacheCreationInputTokens,
        SUM(api_cost) AS apiCost
      FROM session_aggregates
      ${where}
      GROUP BY project, month, tier
      ORDER BY month DESC, project, tier
    `
    )
    .all(sinceDay ? { sinceDay } : {});

  const totals = rows.reduce(
    (acc, r) => {
      acc.sessions += r.sessions || 0;
      acc.messages += r.messages || 0;
      acc.tokens +=
        (r.inputTokens || 0) +
        (r.outputTokens || 0) +
        (r.cacheReadInputTokens || 0) +
        (r.cacheCreationInputTokens || 0);
      acc.apiCost += r.apiCost || 0;
      return acc;
    },
    { sessions: 0, messages: 0, tokens: 0, apiCost: 0 }
  );

  return { rows, totals, groupBy };
}

module.exports = {
  openDatabase,
  rateAt,
  recordPrice,
  listPriceHistory,
  upsertAggregate,
  queryAggregates,
};
