const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  openDatabase,
  rateAt,
  recordPrice,
  listPriceHistory,
  upsertAggregate,
  queryAggregates,
} = require('./db');

function freshDataDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claudewatch-test-'));
  return dir;
}

describe('openDatabase', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = freshDataDir();
    db = openDatabase(dir);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('creates the sqlite file inside the data directory', () => {
    expect(fs.existsSync(path.join(dir, 'claudewatch.sqlite'))).toBe(true);
  });

  it('creates the parent data directory when it does not yet exist', () => {
    const nested = path.join(dir, 'deeper', 'nested');
    expect(fs.existsSync(nested)).toBe(false);
    const ndb = openDatabase(nested);
    expect(fs.existsSync(path.join(nested, 'claudewatch.sqlite'))).toBe(true);
    ndb.close();
  });

  it('seeds the price_history table with 16 default rows on first open', () => {
    const rows = listPriceHistory(db);
    expect(rows.length).toBe(16);
    const tiers = new Set(rows.map((r) => r.tier));
    const dims = new Set(rows.map((r) => r.dimension));
    expect(tiers).toEqual(new Set(['fable', 'opus', 'sonnet', 'haiku']));
    expect(dims).toEqual(
      new Set(['input', 'output', 'cacheCreation', 'cacheRead'])
    );
  });

  it('does not re-seed on subsequent opens', () => {
    db.close();
    db = openDatabase(dir);
    const rows = listPriceHistory(db);
    expect(rows.length).toBe(16);
  });

  it('records the source citation for seeded prices', () => {
    const rows = listPriceHistory(db);
    for (const r of rows) {
      expect(r.source).toMatch(/anthropic\.com|platform\.claude\.com/);
    }
  });

  it('seeds Fable 5 at $10/$50 with standard cache multipliers', () => {
    const rows = listPriceHistory(db).filter((r) => r.tier === 'fable');
    const byDim = Object.fromEntries(rows.map((r) => [r.dimension, r.rate]));
    expect(byDim).toEqual({
      input: 10.0,
      output: 50.0,
      cacheCreation: 12.5,
      cacheRead: 1.0,
    });
  });
});

// ── schema v1 → v2 migration (fable tier added to the CHECK constraint) ──────
describe('schema migration to v2', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = freshDataDir();
    // Hand-build a v1 database: old CHECK without 'fable', 12 seeded rows.
    const Database = require('better-sqlite3');
    const v1 = new Database(path.join(dir, 'claudewatch.sqlite'));
    v1.exec(`
      CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO schema_meta (key, value) VALUES ('schema_version', '1');
      CREATE TABLE price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tier TEXT NOT NULL CHECK (tier IN ('opus', 'sonnet', 'haiku')),
        dimension TEXT NOT NULL CHECK (dimension IN ('input', 'output', 'cacheCreation', 'cacheRead')),
        rate REAL NOT NULL,
        effective_from TEXT NOT NULL,
        source TEXT NOT NULL,
        UNIQUE (tier, dimension, effective_from)
      );
      CREATE INDEX idx_price_history_lookup
        ON price_history (tier, dimension, effective_from);
      INSERT INTO price_history (tier, dimension, rate, effective_from, source) VALUES
        ('opus', 'input', 5.0, '2026-01-01T00:00:00Z', 'docs.anthropic.com'),
        ('opus', 'output', 25.0, '2026-01-01T00:00:00Z', 'docs.anthropic.com'),
        ('opus', 'input', 8.88, '2026-04-01T00:00:00Z', 'user-entered');
    `);
    v1.close();
    db = openDatabase(dir);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('rebuilds price_history so fable rows can be inserted', () => {
    expect(() =>
      recordPrice(db, {
        tier: 'fable',
        dimension: 'input',
        rate: 11,
        effectiveFrom: '2026-07-01T00:00:00Z',
        source: 'test',
      })
    ).not.toThrow();
  });

  it('preserves pre-existing rows (including user-entered ones) and backfills fable', () => {
    const rows = listPriceHistory(db);
    const userRow = rows.find((r) => r.source === 'user-entered');
    expect(userRow).toMatchObject({ tier: 'opus', dimension: 'input', rate: 8.88 });
    const fableRows = rows.filter((r) => r.tier === 'fable');
    expect(fableRows.length).toBe(4);
    // Historical lookups still work across the rebuild
    expect(rateAt(db, 'opus', 'input', '2026-04-15T00:00:00Z', 0)).toBe(8.88);
    expect(rateAt(db, 'fable', 'input', '2026-06-15T00:00:00Z', 0)).toBe(10);
  });

  it('bumps schema_version to 2 and is a no-op on reopen', () => {
    const before = listPriceHistory(db).length;
    db.close();
    db = openDatabase(dir);
    expect(listPriceHistory(db).length).toBe(before);
  });
});

describe('rateAt', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = freshDataDir();
    db = openDatabase(dir);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns the seeded rate for opus/input', () => {
    const rate = rateAt(db, 'opus', 'input', '2026-05-01T00:00:00Z', 999);
    expect(rate).toBe(5);
  });

  it('returns the fallback when no rows exist for the (tier, dimension)', () => {
    const rate = rateAt(db, 'opus', 'input', '2020-01-01T00:00:00Z', 7.7);
    expect(rate).toBe(7.7);
  });

  it('picks the most recent rate effective on or before the asOf date', () => {
    recordPrice(db, {
      tier: 'opus',
      dimension: 'input',
      rate: 8.88,
      effectiveFrom: '2026-04-01T00:00:00Z',
      source: 'test',
    });
    recordPrice(db, {
      tier: 'opus',
      dimension: 'input',
      rate: 99.99,
      effectiveFrom: '2099-12-01T00:00:00Z',
      source: 'future',
    });

    // 2026-04-15 → 2026-04-01 rate
    expect(rateAt(db, 'opus', 'input', '2026-04-15T00:00:00Z', 0)).toBe(8.88);
    // 2026-03-15 → seed (2026-01-01)
    expect(rateAt(db, 'opus', 'input', '2026-03-15T00:00:00Z', 0)).toBe(5);
    // 2100-01-01 → future rate
    expect(rateAt(db, 'opus', 'input', '2100-01-01T00:00:00Z', 0)).toBe(99.99);
  });
});

describe('recordPrice', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = freshDataDir();
    db = openDatabase(dir);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('is idempotent on (tier, dimension, effective_from)', () => {
    const args = {
      tier: 'sonnet',
      dimension: 'output',
      rate: 12.5,
      effectiveFrom: '2026-06-01T00:00:00Z',
      source: 'test',
    };
    recordPrice(db, args);
    recordPrice(db, { ...args, rate: 13.5 });

    const rows = listPriceHistory(db).filter(
      (r) =>
        r.tier === 'sonnet' &&
        r.dimension === 'output' &&
        r.effectiveFrom === '2026-06-01T00:00:00Z'
    );
    expect(rows.length).toBe(1);
    expect(rows[0].rate).toBe(13.5);
  });
});

describe('upsertAggregate + queryAggregates', () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = freshDataDir();
    db = openDatabase(dir);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function aggRow(overrides = {}) {
    return {
      sessionId: 'sess-1',
      project: 'my/proj',
      month: '2026-05',
      day: '2026-05-15',
      tier: 'sonnet',
      model: 'claude-sonnet-4-6',
      messages: 10,
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 100,
      cacheCreateTokens: 50,
      apiCost: 0.05,
      updatedAt: '2026-05-15T12:00:00Z',
      ...overrides,
    };
  }

  it('upserts a single row and returns it in queryAggregates', () => {
    upsertAggregate(db, aggRow());
    const { rows, totals } = queryAggregates(db);
    expect(rows.length).toBe(1);
    expect(rows[0].project).toBe('my/proj');
    expect(rows[0].tier).toBe('sonnet');
    expect(totals.sessions).toBe(1);
    expect(totals.tokens).toBe(1650);
    expect(totals.apiCost).toBeCloseTo(0.05);
  });

  it('updates on conflict instead of creating duplicates', () => {
    upsertAggregate(db, aggRow({ apiCost: 0.05 }));
    upsertAggregate(db, aggRow({ apiCost: 0.99 }));
    const { rows } = queryAggregates(db);
    expect(rows.length).toBe(1);
    expect(rows[0].apiCost).toBeCloseTo(0.99);
  });

  it('treats a different model on the same session as a separate row', () => {
    upsertAggregate(db, aggRow({ model: 'claude-sonnet-4-6', tier: 'sonnet' }));
    upsertAggregate(db, aggRow({ model: 'claude-opus-4-7', tier: 'opus', apiCost: 0.5 }));
    const { rows, totals } = queryAggregates(db);
    // queryAggregates groups by (project, month, tier) so there are 2 rows
    expect(rows.length).toBe(2);
    expect(totals.sessions).toBe(2); // each row counts its DISTINCT sessions
    expect(totals.apiCost).toBeCloseTo(0.55);
  });

  it('rolls up multiple sessions under the same (project, month, tier)', () => {
    upsertAggregate(db, aggRow({ sessionId: 's1', apiCost: 0.10 }));
    upsertAggregate(db, aggRow({ sessionId: 's2', apiCost: 0.20 }));
    upsertAggregate(db, aggRow({ sessionId: 's3', apiCost: 0.30 }));
    const { rows, totals } = queryAggregates(db);
    expect(rows.length).toBe(1);
    expect(rows[0].sessions).toBe(3);
    expect(rows[0].apiCost).toBeCloseTo(0.60);
    expect(totals.apiCost).toBeCloseTo(0.60);
  });

  it('returns empty totals for an empty table', () => {
    const { rows, totals } = queryAggregates(db);
    expect(rows).toEqual([]);
    expect(totals).toEqual({ sessions: 0, messages: 0, tokens: 0, apiCost: 0 });
  });
});
