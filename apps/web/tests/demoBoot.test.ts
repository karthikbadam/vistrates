import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateParagraph, Runtime, VisViewImpl } from '@vistrates/runtime';
import {
  builtinComponents,
  makeMosaicComponent,
  makeSemioticComponent,
  makeVegaLiteComponent,
  registerBuiltins,
} from '@vistrates/components';
import { asComponentId } from '@vistrates/types';

/**
 * Mock the data layer so we don't need DuckDB-WASM. The real boot path runs
 * inside RuntimeProvider; this test mirrors it step-for-step so any drift
 * (missing def registrations, broken paragraph code, dangling src bindings)
 * fails here before it can ship to Pages.
 */
vi.mock('@vistrates/data', () => ({
  exec: vi.fn(() => Promise.resolve()),
  query: vi.fn(() => Promise.resolve({ toArray: () => [] })),
  describeTable: vi.fn((tableName: string) =>
    Promise.resolve({ name: tableName, columns: [], rowCount: 0 }),
  ),
  loadCsvFromUrl: vi.fn(() => Promise.resolve()),
  loadCsvFromText: vi.fn(() => Promise.resolve()),
  loadParquetFromUrl: vi.fn(() => Promise.resolve()),
  viewParquetFromUrl: vi.fn(() => Promise.resolve()),
  startGpsSimulator: vi.fn(() => Promise.resolve({ stop: vi.fn(), tickCount: () => 0 })),
  buildFilterSQL: vi.fn(() => 'SELECT 1'),
  buildSimpleJoinSQL: vi.fn(() => 'SELECT 1'),
  buildGroupBySQL: vi.fn(() => 'SELECT 1'),
  buildDateFilterSQL: vi.fn(() => 'SELECT 1'),
  buildGpsFilterSQL: vi.fn(() => 'SELECT 1'),
}));

import { demos } from '../src/defaultDoc.js';
import { Selection } from '@uwdata/mosaic-core';

const vgStub = new Proxy({}, { get: () => () => document.createElement('div') });

const evalCtx = {
  vg: vgStub,
  Selection,
  makeMosaicComponent,
  makeVegaLiteComponent,
  makeSemioticComponent,
  registry: Object.fromEntries(builtinComponents.map((d) => [d.id, d])),
};

beforeEach(() => {
  vi.clearAllMocks();
});

/** Replays exactly what RuntimeProvider does: register builtins, eval demo
 *  paragraph code to register adapter defs, instantiate every paragraph,
 *  wire src bindings, return the runtime. */
async function bootDemo(demoId: string): Promise<Runtime> {
  const demo = demos.find((d) => d.id === demoId);
  if (!demo) throw new Error(`unknown demo: ${demoId}`);

  const rt = new Runtime();
  registerBuiltins(rt);

  // Eval every paragraph that has code, register its produced def.
  for (const p of demo.paragraphs) {
    if (!p.code) continue;
    if (rt.hasDefinition(p.defId)) continue;
    const result = evaluateParagraph(p.code, evalCtx);
    if (!result.ok) {
      throw new Error(`paragraph ${p.paragraphId} failed to eval: ${result.error.message}`);
    }
    if (!rt.hasDefinition(result.definition.id)) {
      rt.registerDefinition(result.definition);
    }
  }

  // Instantiate every paragraph in pipeline order.
  for (const p of demo.paragraphs) {
    const view = new VisViewImpl({ mode: 'dom', host: document.createElement('div') });
    await rt.instantiate({
      id: p.paragraphId,
      defId: p.defId,
      friendlyName: p.name,
      initialData: p.data as never,
      view,
    });
  }

  // Wire src bindings.
  for (const p of demo.paragraphs) {
    if (!p.src) continue;
    for (const [slot, upstream] of Object.entries(p.src)) {
      rt.bindSrc(asComponentId(p.paragraphId), slot, asComponentId(upstream));
    }
  }

  return rt;
}

for (const demo of demos) {
  describe(`boot ${demo.id} demo`, () => {
    it('registers + instantiates every paragraph without error', async () => {
      const rt = await bootDemo(demo.id);
      const topo = rt.topology();
      // Every declared paragraph lands in the topology.
      for (const p of demo.paragraphs) {
        expect(topo.nodes.find((n) => n.id === p.paragraphId)).toBeDefined();
      }
    });

    it('every defId referenced is registered before instantiate', async () => {
      const rt = await bootDemo(demo.id);
      for (const p of demo.paragraphs) {
        expect(rt.hasDefinition(p.defId)).toBe(true);
      }
    });

    it('every src binding maps to an existing controller', async () => {
      const rt = await bootDemo(demo.id);
      for (const p of demo.paragraphs) {
        if (!p.src) continue;
        for (const upstream of Object.values(p.src)) {
          expect(rt.getController(asComponentId(upstream))).toBeDefined();
        }
      }
    });

    it('topology edges match the demo wiring exactly', async () => {
      const rt = await bootDemo(demo.id);
      const expected = demo.paragraphs.flatMap((p) =>
        Object.entries(p.src ?? {}).map(([via, upstream]) => ({
          from: upstream,
          to: p.paragraphId,
          via,
        })),
      );
      const actual = rt.topology().edges.map((e) => ({ from: e.from, to: e.to, via: e.via }));
      expect(actual.sort((a, b) => (a.from + a.via).localeCompare(b.from + b.via))).toEqual(
        expected.sort((a, b) => (a.from + a.via).localeCompare(b.from + b.via)),
      );
    });
  });
}

describe('demo invariants', () => {
  it('every paragraph using a builtin source/processing defId is invisible', () => {
    const builtinIds = new Set(builtinComponents.map((d) => d.id));
    for (const demo of demos) {
      for (const p of demo.paragraphs) {
        if (!builtinIds.has(p.defId)) continue;
        // Source/processing paragraphs have no view — must be marked invisible
        // so the Dashboard doesn't render an empty card. See DemoParagraphConfig.
        expect(p.visible).toBe(false);
      }
    }
  });

  it('every visible paragraph references a non-builtin (visualization adapter) defId', () => {
    const builtinIds = new Set(builtinComponents.map((d) => d.id));
    for (const demo of demos) {
      for (const p of demo.paragraphs) {
        if (p.visible === false) continue;
        expect(builtinIds.has(p.defId)).toBe(false);
      }
    }
  });

  it('every demo has at least one visible paragraph (something to look at)', () => {
    for (const demo of demos) {
      const visible = demo.paragraphs.filter((p) => p.visible !== false);
      expect(visible.length).toBeGreaterThan(0);
    }
  });
});
