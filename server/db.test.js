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

  it('seeds the price_history table with 12 default rows on first open', () => {
    const rows = listPriceHistory(db);
    expect(rows.length).toBe(12);
    const tiers = new Set(rows.map((r) => r.tier));
    const dims = new Set(rows.map((r) => r.dimension));
    expect(tiers).toEqual(new Set(['opus', 'sonnet', 'haiku']));
    expect(dims).toEqual(
      new Set(['input', 'output', 'cacheCreation', 'cacheRead'])
    );
  });

  it('does not re-seed on subsequent opens', () => {
    db.close();
    db = openDatabase(dir);
    const rows = listPriceHistory(db);
    expect(rows.length).toBe(12);
  });

  it('records the source citation for seeded prices', () => {
    const rows = listPriceHistory(db);
    for (const r of rows) {
      expect(r.source).toMatch(/anthropic\.com/);
    }
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
