import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Runtime, type TopologyEvent } from '@vistrates/runtime';
import {
  builtinComponents,
  makeMosaicComponent,
  makeVegaLiteComponent,
  registerBuiltins,
} from '@vistrates/components';
import { attachIndexedDB, connectWebsocket, DocStore } from '@vistrates/doc';
import type { ComponentId } from '@vistrates/types';
import { asComponentId } from '@vistrates/types';
import * as vg from '@uwdata/vgplot';
import { DEFAULT_DOC_ID, DEFAULT_DOC_TITLE, demoDoc } from './defaultDoc.js';

interface RuntimeCtxValue {
  readonly runtime: Runtime;
  readonly doc: DocStore;
  /** Per-paragraph view host element. The shell mounts this in the dashboard. */
  readonly hostFor: (paragraphId: string) => HTMLElement;
  readonly bootStatus: 'pending' | 'ready' | { error: string };
  /** The eval-time context handed to paragraph code. */
  readonly evalCtx: Readonly<Record<string, unknown>>;
}

const RuntimeCtx = createContext<RuntimeCtxValue | undefined>(undefined);

export function useRuntime(): RuntimeCtxValue {
  const ctx = useContext(RuntimeCtx);
  if (!ctx) throw new Error('useRuntime called outside RuntimeProvider');
  return ctx;
}

/** Force re-render whenever any topology event fires. */
export function useTopologyTick(): number {
  const { runtime } = useRuntime();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsub = runtime.subscribe((_evt: TopologyEvent) => setTick((n) => n + 1));
    return () => unsub();
  }, [runtime]);
  return tick;
}

interface RuntimeProviderProps {
  readonly children: ReactNode;
}

export function RuntimeProvider({ children }: RuntimeProviderProps): ReactNode {
  const runtime = useMemo(() => new Runtime(), []);
  const doc = useMemo(() => new DocStore(), []);
  const hosts = useRef(new Map<string, HTMLElement>());
  const [bootStatus, setBootStatus] = useState<RuntimeCtxValue['bootStatus']>('pending');

  // Eval context for live paragraph code. Stable across re-renders.
  const evalCtx = useMemo(
    () => ({
      vg,
      makeMosaicComponent,
      makeVegaLiteComponent,
      registry: Object.fromEntries(builtinComponents.map((d) => [d.id, d])),
    }),
    [],
  );

  const hostFor = (paragraphId: string): HTMLElement => {
    let host = hosts.current.get(paragraphId);
    if (!host) {
      host = document.createElement('div');
      host.className = 'vis-host';
      host.dataset['paragraph'] = paragraphId;
      hosts.current.set(paragraphId, host);
    }
    return host;
  };

  useEffect(() => {
    let cancelled = false;
    let cleanupCollab: (() => void) | undefined;
    void (async () => {
      try {
        // 0. Local + collab persistence (best-effort; failures are logged
        //    but never block the boot — the demo still runs in-memory).
        try {
          await attachIndexedDB(doc, `vistrates-${DEFAULT_DOC_ID}`);
        } catch (e) {
          console.warn('[vistrates] IndexedDB persistence skipped:', e);
        }
        const params = new URLSearchParams(window.location.search);
        if (params.get('collab') === '1') {
          try {
            const wsUrl = (import.meta.env.DEV ? 'ws://127.0.0.1:3001' : 'ws://' + window.location.host) + '/collab';
            const session = await connectWebsocket(doc, { url: wsUrl, room: DEFAULT_DOC_ID });
            cleanupCollab = () => session.destroy();
            console.info('[vistrates] collab connected:', wsUrl, DEFAULT_DOC_ID);
          } catch (e) {
            console.warn('[vistrates] collab connect failed:', e);
          }
        }

        // 1. Register built-ins.
        registerBuiltins(runtime);

        // 2. Register the dynamic adapter outputs that the demo paragraphs reference.
        //    (Live paragraph code can re-register/hot-swap these.)
        const demoBar = makeMosaicComponent({
          id: 'demo-mosaic-bar',
          name: 'Bar Chart (Mosaic vgplot)',
          version: '0.1.0',
          spec: ({ table, selection }) =>
            vg.plot(
              vg.barY(vg.from(table, { filterBy: selection }), {
                x: 'species',
                y: vg.count(),
                fill: 'species',
              }),
              vg.width(640),
              vg.height(360),
              vg.marginLeft(60),
            ) as Element,
        });
        const demoScatter = makeVegaLiteComponent({
          id: 'demo-vegalite-scatter',
          name: 'Sepal length vs width',
          version: '0.1.0',
          spec: () => ({
            width: 480,
            height: 320,
            mark: { type: 'point', filled: true, size: 80 },
            encoding: {
              x: { field: 'sepal_length', type: 'quantitative' },
              y: { field: 'sepal_width', type: 'quantitative' },
              color: { field: 'species', type: 'nominal' },
            },
          }),
        });
        if (!runtime.hasDefinition(demoBar.id)) runtime.registerDefinition(demoBar);
        if (!runtime.hasDefinition(demoScatter.id)) runtime.registerDefinition(demoScatter);

        // 3. Seed the doc store.
        doc.init({ id: DEFAULT_DOC_ID, title: DEFAULT_DOC_TITLE });
        doc.addSection({
          id: 'sec-main',
          name: 'Pipeline',
          paragraphs: demoDoc.map((p) => ({
            id: p.paragraphId,
            kind: 'code' as const,
            name: p.name,
            ...(p.code !== undefined ? { code: p.code } : {}),
            data: p.data as Record<string, never>,
          })),
        });

        // 4. Instantiate controllers in pipeline order.
        const { VisViewImpl } = await import('@vistrates/runtime');
        for (const p of demoDoc) {
          const view = new VisViewImpl({ mode: 'dom', host: hostFor(p.paragraphId) });
          await runtime.instantiate({
            id: p.paragraphId,
            defId: p.defId,
            friendlyName: p.name,
            initialData: p.data as never,
            view,
          });
        }

        // 5. Wire src bindings (post-instantiate so all controllers exist).
        for (const p of demoDoc) {
          if (!p.src) continue;
          for (const [slot, upstream] of Object.entries(p.src)) {
            runtime.bindSrc(asComponentId(p.paragraphId), slot, asComponentId(upstream));
          }
        }

        if (!cancelled) setBootStatus('ready');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[vistrates] boot failed:', err);
        if (!cancelled) setBootStatus({ error: message });
      }
    })();
    return () => {
      cancelled = true;
      cleanupCollab?.();
    };
  }, [runtime, doc]);

  const value: RuntimeCtxValue = {
    runtime,
    doc,
    hostFor,
    bootStatus,
    evalCtx,
  };

  return <RuntimeCtx.Provider value={value}>{children}</RuntimeCtx.Provider>;
}

/** Convenience: get the controller for a paragraph id, or undefined. */
export function useController(paragraphId: string): ReturnType<Runtime['getController']> {
  const { runtime } = useRuntime();
  useTopologyTick();
  return runtime.getController(asComponentId(paragraphId));
}

export type { ComponentId };
