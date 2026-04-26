import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Mock @uwdata/mosaic-core's wasmConnector. The real connector starts with
 * `_db === undefined` and only initializes lazily when getDuckDB() (or any
 * query) fires — see node_modules/@uwdata/mosaic-core/.../connectors/wasm.js.
 *
 * If `loadCsvFromText` reaches into `_db` directly, it throws here because
 * `_db` is undefined until `getDuckDB()` resolves. This regression test
 * locks in the correct lifecycle.
 */
const registerCalls: Array<{ name: string; content: string }> = [];
const execCalls: string[] = [];
const fakeDuckDB = {
  registerFileText: vi.fn((name: string, content: string) => {
    registerCalls.push({ name, content });
    return Promise.resolve();
  }),
};

// The lazy-init flag — flipped by `getDuckDB()` only.
let lazyInitialized = false;

function makeFakeConnector(): unknown {
  return {
    _db: undefined,
    getDuckDB: vi.fn(() => {
      lazyInitialized = true;
      return Promise.resolve(fakeDuckDB);
    }),
  };
}

let fakeConnector = makeFakeConnector();

vi.mock('@uwdata/mosaic-core', () => ({
  Coordinator: class {
    databaseConnector(): unknown {
      return fakeConnector;
    }
    exec(sql: string | string[]): Promise<void> {
      if (typeof sql === 'string') execCalls.push(sql);
      else for (const s of sql) execCalls.push(s);
      return Promise.resolve();
    }
    query(): Promise<unknown> {
      return Promise.resolve({ toArray: () => [] });
    }
  },
  wasmConnector: vi.fn(() => fakeConnector),
}));

import { loadCsvFromText, _resetCoordinatorForTesting } from '../src/index.js';

beforeEach(() => {
  _resetCoordinatorForTesting();
  registerCalls.length = 0;
  execCalls.length = 0;
  lazyInitialized = false;
  fakeConnector = makeFakeConnector();
});

describe('loadCsvFromText (regression for empty-chart bug)', () => {
  it('triggers DuckDB lazy init via getDuckDB() — does NOT touch connector._db directly', async () => {
    expect(lazyInitialized).toBe(false);
    await loadCsvFromText('iris', 'a,b\n1,2\n3,4');
    // The fix: we must have called getDuckDB() (the public async method) so
    // the wasm connector lazy-loads its underlying DuckDB instance.
    expect(lazyInitialized).toBe(true);
    expect(registerCalls).toHaveLength(1);
    expect(registerCalls[0]?.content).toContain('a,b');
  });

  it('issues a CREATE TABLE … read_csv_auto(<registered file>) statement', async () => {
    await loadCsvFromText('iris', 'col\n1\n2');
    const createSql = execCalls.find((s) => s.includes('CREATE OR REPLACE TABLE'));
    expect(createSql).toBeDefined();
    expect(createSql).toContain('"iris"');
    expect(createSql).toContain('read_csv_auto');
    // The temp filename starts with `_inline_iris_` and is referenced from the SQL.
    expect(createSql).toMatch(/_inline_iris_/);
  });

  it('throws a clear error when the connector does not expose getDuckDB()', async () => {
    fakeConnector = { _db: undefined };
    _resetCoordinatorForTesting();
    await expect(loadCsvFromText('iris', 'a\n1')).rejects.toThrow(/getDuckDB/);
  });
});
