import type {
  AnyVisComponentDefinition,
  AnyVisController,
  ComponentOutput,
  JsonValue,
} from '@vistrates/types';

export interface DomMountContext {
  readonly host: HTMLElement;
  readonly upstream: ComponentOutput | undefined;
  readonly controller: AnyVisController;
}

export interface DomComponentSpec {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  /** Initial render. Return any state you want kept across updates. */
  readonly mount: (ctx: DomMountContext) => unknown | Promise<unknown>;
  /** Re-render when an upstream source pushes a new output. */
  readonly update?: (
    ctx: DomMountContext & { readonly state: unknown; readonly source: string | undefined },
  ) => void | Promise<void>;
  /** Tear-down. */
  readonly unmount?: (
    ctx: { readonly host: HTMLElement; readonly state: unknown },
  ) => void | Promise<void>;
}

/**
 * Escape-hatch adapter: build a `VisComponentDefinition` from imperative
 * mount/update/unmount callbacks against a DOM host element. Used for any
 * library (Leaflet, Plotly, custom D3, etc.) that doesn't fit the Mosaic /
 * Semiotic / Vega-Lite shapes.
 *
 * Expects the controller to have a `view` (provided by the host shell on
 * instantiate). If `view` is missing, mount/update become no-ops.
 */
export function makeDomComponent(
  spec: DomComponentSpec,
): AnyVisComponentDefinition {
  const stateByController = new WeakMap<AnyVisController, unknown>();

  return {
    id: spec.id,
    name: spec.name,
    version: spec.version,
    ...(spec.description !== undefined ? { description: spec.description } : {}),
    ...(spec.tags !== undefined ? { tags: spec.tags } : {}),
    src: { in: 'table' as const, selection: 'clause' as const },
    props: [],
    async init() {
      if (!this.view) return;
      const upstream = firstUpstream(this);
      const state = await spec.mount({
        host: this.view.element,
        upstream,
        controller: this,
      });
      stateByController.set(this, state);
    },
    async update(source) {
      if (!this.view) return;
      const upstream = firstUpstream(this);
      if (spec.update) {
        await spec.update({
          host: this.view.element,
          upstream,
          controller: this,
          state: stateByController.get(this),
          source,
        });
      }
    },
    destroy() {
      if (!this.view) return;
      const state = stateByController.get(this);
      void spec.unmount?.({ host: this.view.element, state });
      stateByController.delete(this);
    },
  } satisfies AnyVisComponentDefinition;
}

function firstUpstream(controller: AnyVisController): ComponentOutput | undefined {
  // Convention: the `in` slot is the primary data input. Adapters that need
  // multiple sources should access `controller.src` directly.
  const src = controller.src as Readonly<Record<string, ComponentOutput | null>>;
  const t = src['in'];
  if (t) return t;
  const c = src['selection'];
  if (c) return c;
  return undefined;
}

/** Convenience: erase the type back to `JsonValue` defaultData when needed. */
export const _voidDefaultData = (): JsonValue => null;
