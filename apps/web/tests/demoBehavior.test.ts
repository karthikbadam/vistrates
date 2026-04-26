import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Runtime, VisViewImpl } from '@vistrates/runtime';
import { asComponentId } from '@vistrates/types';

// Mock the data layer so demos can wire end-to-end without DuckDB-WASM.
vi.mock('@vistrates/data', () => {
  const calls: { exec: string[]; csv: Array<{ name: string; rowCount: number }> } = {
    exec: [],
    csv: [],
  };
  return {
    exec: vi.fn((sql: string | string[]) => {
      if (typeof sql === 'string') calls.exec.push(sql);
      else for (const s of sql) calls.exec.push(s);
      return Promise.resolve();
    }),
    query: vi.fn(() => Promise.resolve({ toArray: () => [] })),
    describeTable: vi.fn((tableName: string) =>
      Promise.resolve({
        name: tableName,
        columns: [
          { name: 'col_a', type: 'VARCHAR' },
          { name: 'col_b', type: 'DOUBLE' },
        ],
        rowCount: 0,
      }),
    ),
    loadCsvFromUrl: vi.fn(() => Promise.resolve()),
    loadCsvFromText: vi.fn((table: string, text: string) => {
      const rows = text.trim().split('\n').length - 1; // minus header
      calls.csv.push({ name: table, rowCount: rows });
      return Promise.resolve();
    }),
    loadParquetFromUrl: vi.fn(() => Promise.resolve()),
    viewParquetFromUrl: vi.fn(() => Promise.resolve()),
    startGpsSimulator: vi.fn(() => Promise.resolve({ stop: vi.fn(), tickCount: () => 0 })),
    buildFilterSQL: vi.fn(({ fromTable, toTable }: { fromTable: string; toTable: string }) =>
      `CREATE OR REPLACE VIEW "${toTable}" AS SELECT * FROM "${fromTable}"`,
    ),
    buildSimpleJoinSQL: vi.fn(() => 'SELECT 1'),
    buildGroupBySQL: vi.fn(() => 'SELECT 1'),
    buildDateFilterSQL: vi.fn(() => 'SELECT 1'),
    buildGpsFilterSQL: vi.fn(() => 'SELECT 1'),
    __calls: calls,
  };
});

import { CARS_CSV, IRIS_CSV, demos } from '../src/defaultDoc.js';
import { builtinComponents } from '@vistrates/components';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('inline demo CSVs', () => {
  it('IRIS_CSV has the species column and the expected row counts per class', () => {
    const lines = IRIS_CSV.trim().split('\n');
    const header = lines[0]!.split(',');
    expect(header).toContain('species');
    expect(header).toContain('sepal_length');
    const speciesCounts = new Map<string, number>();
    for (const line of lines.slice(1)) {
      const cols = line.split(',');
      const species = cols[0]!;
      speciesCounts.set(species, (speciesCounts.get(species) ?? 0) + 1);
    }
    expect(speciesCounts.get('setosa')).toBe(6);
    expect(speciesCounts.get('versicolor')).toBe(6);
    expect(speciesCounts.get('virginica')).toBe(6);
  });

  it('CARS_CSV has the origin column and at least one row per origin', () => {
    const lines = CARS_CSV.trim().split('\n');
    const header = lines[0]!.split(',');
    const originIdx = header.indexOf('origin');
    expect(originIdx).toBeGreaterThan(-1);
    const origins = new Set<string>();
    for (const line of lines.slice(1)) origins.add(line.split(',')[originIdx]!);
    expect(origins).toEqual(new Set(['Asia', 'Europe', 'US']));
  });

  it('CARS_CSV mpg values are all finite positive numbers', () => {
    const lines = CARS_CSV.trim().split('\n');
    const header = lines[0]!.split(',');
    const mpgIdx = header.indexOf('mpg');
    for (const line of lines.slice(1)) {
      const mpg = Number(line.split(',')[mpgIdx]);
      expect(Number.isFinite(mpg)).toBe(true);
      expect(mpg).toBeGreaterThan(0);
    }
  });
});

describe('demo wiring (built-ins only, with mocked data layer)', () => {
  /** Paragraphs whose defId is a builtin (skipping factory-built defs like demo-mosaic-bar). */
  function builtinParagraphs(demoId: string) {
    const demo = demos.find((d) => d.id === demoId);
    if (!demo) throw new Error(`unknown demo: ${demoId}`);
    const builtinIds = new Set(builtinComponents.map((d) => d.id));
    return demo.paragraphs.filter((p) => builtinIds.has(p.defId));
  }

  it('iris: csv-loader → filter wires correctly and the runtime topology reflects it', async () => {
    const rt = new Runtime();
    for (const def of builtinComponents) rt.registerDefinition(def);

    const paras = builtinParagraphs('iris'); // p-csv (csv-loader) + p-filter (filter)
    expect(paras.map((p) => p.defId)).toEqual(['csv-loader', 'filter']);

    for (const p of paras) {
      const view = new VisViewImpl({ mode: 'dom', host: document.createElement('div') });
      await rt.instantiate({
        id: p.paragraphId,
        defId: p.defId,
        friendlyName: p.name,
        initialData: p.data as never,
        view,
      });
    }
    for (const p of paras) {
      if (!p.src) continue;
      for (const [slot, upstream] of Object.entries(p.src)) {
        rt.bindSrc(asComponentId(p.paragraphId), slot, asComponentId(upstream));
      }
    }

    const topo = rt.topology();
    expect(topo.nodes.map((n) => n.id).sort()).toEqual(['p-csv', 'p-filter']);
    expect(topo.edges).toEqual([{ from: 'p-csv', to: 'p-filter', via: 'in' }]);
  });

  it('cars: csv-loader is the only builtin paragraph and has no src bindings', () => {
    const paras = builtinParagraphs('cars');
    expect(paras).toHaveLength(1);
    expect(paras[0]?.defId).toBe('csv-loader');
    expect(paras[0]?.src).toBeUndefined();
  });

  it('gps: gps-simulator paragraph is registered with the expected default config', () => {
    const paras = builtinParagraphs('gps');
    expect(paras).toHaveLength(1);
    expect(paras[0]?.defId).toBe('gps-simulator');
    const data = paras[0]?.data as { tableName: string; intervalMs: number; agents: number };
    expect(data.tableName).toBe('gps_stream');
    expect(data.intervalMs).toBeGreaterThan(0);
    expect(data.agents).toBeGreaterThanOrEqual(1);
  });
});

describe('demo paragraph data sanity', () => {
  it('every paragraph data block is a plain JSON object', () => {
    for (const demo of demos) {
      for (const p of demo.paragraphs) {
        expect(typeof p.data).toBe('object');
        expect(Array.isArray(p.data)).toBe(false);
      }
    }
  });

  it('iris CSV-loader paragraph carries the inline CSV text', () => {
    const irisCsv = demos.find((d) => d.id === 'iris')?.paragraphs[0];
    expect((irisCsv?.data as { text?: string }).text).toBe(IRIS_CSV);
  });

  it('every demo declares at least one source paragraph (no `src` slot)', () => {
    for (const demo of demos) {
      const sources = demo.paragraphs.filter((p) => !p.src);
      expect(sources.length).toBeGreaterThanOrEqual(1);
    }
  });
});
