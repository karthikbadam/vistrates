import type {
  AnyVisComponentDefinition,
  AnyVisController,
  ComponentId,
  JsonValue,
  PropBinding,
  VisView,
} from '@vistrates/types';
import { asComponentId } from '@vistrates/types';
import { TopologyBus, type TopologyListener } from './topology.js';
import { VisControllerImpl, type ControllerOptions } from './visController.js';

export interface InstantiateOptions {
  readonly id: string;
  readonly defId: string;
  readonly friendlyName?: string;
  readonly initialData?: JsonValue;
  readonly initialSrc?: Readonly<Record<string, string | null>>;
  readonly initialProps?: Readonly<Record<string, PropBinding | JsonValue | null>>;
  readonly view?: VisView;
}

export interface TopologySnapshot {
  readonly nodes: ReadonlyArray<{
    readonly id: ComponentId;
    readonly defId: string;
    readonly friendlyName: string;
  }>;
  readonly edges: ReadonlyArray<{
    readonly from: ComponentId;
    readonly to: ComponentId;
    readonly via: string;
  }>;
}

export class Runtime {
  readonly #bus = new TopologyBus();
  readonly #definitions = new Map<string, AnyVisComponentDefinition>();
  readonly #controllers = new Map<ComponentId, VisControllerImpl>();
  readonly #defIdByController = new Map<ComponentId, string>();
  /** Inverse adjacency (`upstream id → set of downstream ids`). */
  readonly #observers = new Map<ComponentId, Set<ComponentId>>();
  /** Forward adjacency (`downstream id → map<srcName, upstream id>`). */
  readonly #sources = new Map<ComponentId, Map<string, ComponentId>>();

  constructor() {
    // Single internal subscriber: route output changes to observing controllers.
    this.#bus.subscribe((evt) => {
      if (evt.kind !== 'outputChanged') return;
      const observers = this.#observers.get(evt.id);
      if (!observers) return;
      for (const downstream of observers) {
        const srcs = this.#sources.get(downstream);
        if (!srcs) continue;
        for (const [srcName, upstream] of srcs) {
          if (upstream === evt.id) {
            void this.#runUpdate(downstream, srcName);
          }
        }
      }
    });
  }

  registerDefinition(def: AnyVisComponentDefinition): void {
    if (this.#definitions.has(def.id)) {
      throw new Error(`runtime: definition already registered: ${def.id}`);
    }
    this.#definitions.set(def.id, def);
  }

  unregisterDefinition(defId: string): void {
    this.#definitions.delete(defId);
  }

  hasDefinition(defId: string): boolean {
    return this.#definitions.has(defId);
  }

  getDefinition(defId: string): AnyVisComponentDefinition | undefined {
    return this.#definitions.get(defId);
  }

  getController(id: ComponentId): AnyVisController | undefined {
    return this.#controllers.get(id);
  }

  /** Create a controller, run init + update(undefined). */
  async instantiate(opts: InstantiateOptions): Promise<AnyVisController> {
    const id = asComponentId(opts.id);
    if (this.#controllers.has(id)) {
      throw new Error(`runtime: controller already exists: ${opts.id}`);
    }
    const def = this.#definitions.get(opts.defId);
    if (!def) throw new Error(`runtime: unknown definition: ${opts.defId}`);

    const initialConfig = {
      src: Object.fromEntries(
        Object.entries(opts.initialSrc ?? {}).map(([k, v]) => [
          k,
          v === null ? null : { src: asComponentId(v) },
        ]),
      ),
      props: { ...(opts.initialProps ?? {}) },
    } as unknown as ControllerOptions['initialConfig'];

    const controller = new VisControllerImpl({
      id,
      friendlyName: opts.friendlyName ?? def.name,
      definition: def,
      initialData: opts.initialData ?? def.defaultData ?? null,
      ...(initialConfig !== undefined ? { initialConfig } : {}),
      ...(opts.view !== undefined ? { view: opts.view } : {}),
      bus: this.#bus,
      resolveOutput: (cid) => this.#controllers.get(cid)?.output,
    });
    this.#controllers.set(id, controller);
    this.#defIdByController.set(id, def.id);

    // Seed source adjacency.
    const srcMap = new Map<string, ComponentId>();
    for (const [k, v] of Object.entries(opts.initialSrc ?? {})) {
      if (v) {
        const upstream = asComponentId(v);
        srcMap.set(k, upstream);
        this.#observerSet(upstream).add(id);
      }
    }
    this.#sources.set(id, srcMap);

    this.#bus.emit({ kind: 'controllerRegistered', id, defId: def.id });

    if (def.init) {
      try {
        await def.init.call(controller);
      } catch (err: unknown) {
        console.error('[vistrates] init() threw:', err);
      }
    }
    if (def.update) {
      try {
        await def.update.call(controller, undefined);
      } catch (err: unknown) {
        console.error('[vistrates] update(undefined) threw:', err);
      }
    }

    return controller;
  }

  /** Hot-swap: destroy → swap definition → init → update(undefined). */
  async hotSwap(id: ComponentId, def: AnyVisComponentDefinition): Promise<void> {
    const controller = this.#controllers.get(id);
    if (!controller) throw new Error(`runtime: no controller to hot-swap: ${id}`);
    const oldDef = controller.definition;
    if (oldDef.destroy) {
      try {
        oldDef.destroy.call(controller);
      } catch (err: unknown) {
        console.error('[vistrates] destroy() threw:', err);
      }
    }
    controller.swapDefinition(def);
    this.#defIdByController.set(id, def.id);
    if (def.init) {
      try {
        await def.init.call(controller);
      } catch (err: unknown) {
        console.error('[vistrates] init() after hotSwap threw:', err);
      }
    }
    if (def.update) {
      try {
        await def.update.call(controller, undefined);
      } catch (err: unknown) {
        console.error('[vistrates] update(undefined) after hotSwap threw:', err);
      }
    }
  }

  destroy(id: ComponentId): void {
    const controller = this.#controllers.get(id);
    if (!controller) return;
    const def = controller.definition;
    if (def.destroy) {
      try {
        def.destroy.call(controller);
      } catch (err: unknown) {
        console.error('[vistrates] destroy() threw:', err);
      }
    }
    const srcs = this.#sources.get(id);
    if (srcs) {
      for (const upstream of srcs.values()) {
        this.#observers.get(upstream)?.delete(id);
      }
    }
    this.#sources.delete(id);
    this.#observers.delete(id);
    this.#controllers.delete(id);
    this.#defIdByController.delete(id);
    this.#bus.emit({ kind: 'controllerUnregistered', id });
  }

  bindSrc(id: ComponentId, srcName: string, srcId: ComponentId | null): void {
    const controller = this.#controllers.get(id);
    if (!controller) throw new Error(`runtime: no controller: ${id}`);
    const srcs = this.#sources.get(id) ?? new Map<string, ComponentId>();
    const prev = srcs.get(srcName) ?? null;
    if (prev !== null) {
      this.#observers.get(prev)?.delete(id);
    }
    if (srcId === null) {
      srcs.delete(srcName);
      controller.removeSource(srcName);
    } else {
      srcs.set(srcName, srcId);
      this.#observerSet(srcId).add(id);
      controller.addSource(srcName, srcId);
    }
    this.#sources.set(id, srcs);
    if (srcId !== null && this.#controllers.get(srcId)?.output !== undefined) {
      void this.#runUpdate(id, srcName);
    }
  }

  subscribe(listener: TopologyListener): () => void {
    return this.#bus.subscribe(listener);
  }

  topology(): TopologySnapshot {
    const nodes: TopologySnapshot['nodes'] = Array.from(this.#controllers.values()).map((c) => ({
      id: c.id,
      defId: this.#defIdByController.get(c.id) ?? 'unknown',
      friendlyName: c.friendlyName,
    }));
    const edges: Array<TopologySnapshot['edges'][number]> = [];
    for (const [downstream, srcs] of this.#sources) {
      for (const [via, upstream] of srcs) {
        edges.push({ from: upstream, to: downstream, via });
      }
    }
    return { nodes, edges };
  }

  /**
   * Ask a controller to re-run its `update(undefined)` lifecycle method.
   * Useful when external state (a moved DOM host, a layout change) needs
   * the chart to repaint without changing any source. No-op if the
   * controller doesn't exist.
   */
  async refresh(id: ComponentId): Promise<void> {
    await this.#runUpdate(id, undefined);
  }

  // ----- internals -----

  #observerSet(id: ComponentId): Set<ComponentId> {
    let set = this.#observers.get(id);
    if (!set) {
      set = new Set<ComponentId>();
      this.#observers.set(id, set);
    }
    return set;
  }

  async #runUpdate(id: ComponentId, srcName: string | undefined): Promise<void> {
    const controller = this.#controllers.get(id);
    if (!controller) return;
    const def = controller.definition;
    if (!def.update) return;
    try {
      await def.update.call(controller, srcName);
    } catch (err: unknown) {
      console.error(`[vistrates] update(${srcName}) on ${id} threw:`, err);
    }
  }
}

export type { TopologyEvent, TopologyListener } from './topology.js';
