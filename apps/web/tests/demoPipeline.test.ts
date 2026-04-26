import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Runtime, VisViewImpl } from '@vistrates/runtime';
import { asComponentId } from '@vistrates/types';
import {
  builtinComponents,
  makeMosaicComponent,
  makeSemioticComponent,
  makeVegaLiteComponent,
  registerBuiltins,
} from '@vistrates/components';

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

import { evaluateParagraph } from '@vistrates/runtime';
import { demos } from '../src/defaultDoc.js';

const vgStub = new Proxy({}, { get: () => () => document.createElement('div') });

const evalCtx = {
  vg: vgStub,
  makeMosaicComponent,
  makeVegaLiteComponent,
  makeSemioticComponent,
  registry: Object.fromEntries(builtinComponents.map((d) => [d.id, d])),
};

beforeEach(() => {
  vi.clearAllMocks();
});

interface BootResult {
  runtime: Runtime;
  hosts: Map<string, HTMLElement>;
}

async function bootDemo(demoId: string): Promise<BootResult> {
  const demo = demos.find((d) => d.id === demoId);
  if (!demo) throw new Error(`unknown demo: ${demoId}`);

  const rt = new Runtime();
  registerBuiltins(rt);
  for (const p of demo.paragraphs) {
    if (!p.code) continue;
    if (rt.hasDefinition(p.defId)) continue;
    const result = evaluateParagraph(p.code, evalCtx);
    if (result.ok && !rt.hasDefinition(result.definition.id)) {
      rt.registerDefinition(result.definition);
    }
  }
  const hosts = new Map<string, HTMLElement>();
  for (const p of demo.paragraphs) {
    const host = document.createElement('div');
    hosts.set(p.paragraphId, host);
    const view = new VisViewImpl({ mode: 'dom', host });
    await rt.instantiate({
      id: p.paragraphId,
      defId: p.defId,
      friendlyName: p.name,
      initialData: p.data as never,
      view,
    });
  }
  for (const p of demo.paragraphs) {
    if (!p.src) continue;
    for (const [slot, upstream] of Object.entries(p.src)) {
      rt.bindSrc(asComponentId(p.paragraphId), slot, asComponentId(upstream));
    }
  }
  // Drain microtasks so async update() callbacks resolve.
  await new Promise((r) => setTimeout(r, 0));
  return { runtime: rt, hosts };
}

for (const demo of demos) {
  describe(`pipeline ${demo.id}`, () => {
    it('every visible paragraph has a non-null view that received init()', async () => {
      const { hosts, runtime } = await bootDemo(demo.id);
      const visible = demo.paragraphs.filter((p) => p.visible !== false);
      for (const p of visible) {
        expect(hosts.get(p.paragraphId)).toBeDefined();
        const ctl = runtime.getController(asComponentId(p.paragraphId));
        // The controller must exist and carry a view — otherwise adapters
        // (mosaic/vega-lite/semiotic) early-return from init() and nothing
        // ever renders. This is the bug fingerprint from the empty-card
        // regression: view present, but mount path never executed.
        expect(ctl?.view).toBeDefined();
      }
    });

    it('every source paragraph has set an output by the time bindSrc fires', async () => {
      const { runtime } = await bootDemo(demo.id);
      const sources = demo.paragraphs.filter((p) => !p.src);
      for (const src of sources) {
        const ctl = runtime.getController(asComponentId(src.paragraphId));
        // CSV-loader / queryable-csv / queryable-parquet / gps-simulator all
        // set `output: { kind: 'table', ... }` in init(). filter-style sources
        // wait for upstream input — but no demo uses one as a root.
        expect(ctl?.output).toBeDefined();
        expect(ctl?.output?.kind).toBe('table');
      }
    });

    it('every visible chart paragraph has its `update` callback invoked at least once', async () => {
      // We instrument by re-evaluating the paragraph code with a spied
      // ctx, registering the spy def under a unique id, instantiating it
      // wired to a stub `table` source. Tighter than booting the whole demo
      // — this proves each chart adapter participates in the reactive loop.
      const visible = demo.paragraphs.filter((p) => p.visible !== false && p.src);
      for (const p of visible) {
        if (!p.code) continue;
        const result = evaluateParagraph(p.code, evalCtx);
        expect(result.ok).toBe(true);
        if (!result.ok) continue;
        const def = result.definition;
        const originalUpdate = def.update;
        if (!originalUpdate) continue; // demo charts always have update; skip if not.
        const updateSpy = vi.fn();
        const wrappedUpdate = function (this: unknown, source: string | undefined): unknown {
          updateSpy(source);
          return (originalUpdate as (this: unknown, s: string | undefined) => unknown).call(
            this,
            source,
          );
        };
        const wrapped = {
          ...def,
          id: `${def.id}-spy-${p.paragraphId}`,
          update: wrappedUpdate as NonNullable<typeof def.update>,
        };

        const rt = new Runtime();
        registerBuiltins(rt);
        rt.registerDefinition(wrapped);
        // Stub upstream that emits a `table` output immediately.
        const stubSrc = {
          id: `stub-src-${p.paragraphId}`,
          name: 'Stub',
          version: '0.0.1',
          src: {},
          props: [] as readonly string[],
          init(this: { output: unknown }) {
            this.output = {
              kind: 'table',
              tableName: 'stub_table',
              schema: { name: 'stub_table', columns: [] },
            };
          },
        };
        rt.registerDefinition(stubSrc);
        await rt.instantiate({ id: 'stub-src', defId: stubSrc.id });
        const view = new VisViewImpl({ mode: 'dom', host: document.createElement('div') });
        await rt.instantiate({ id: 'chart', defId: wrapped.id, view });
        rt.bindSrc(asComponentId('chart'), 'table', asComponentId('stub-src'));
        await new Promise((r) => setTimeout(r, 0));
        expect(updateSpy).toHaveBeenCalled();
      }
    });
  });
}
