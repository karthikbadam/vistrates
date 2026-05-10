import type {
  AnyVisComponentDefinition,
  AnyVisController,
  JsonObject,
} from '@vistrates/types';

export interface VegaLiteComponentSpec {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  /** A Vega-Lite spec or a function that produces one given the bound table name. */
  readonly spec: JsonObject | ((ctx: { readonly table: string }) => JsonObject);
}

interface VegaState {
  view?: { finalize: () => void };
}

/**
 * Render a Vega-Lite spec. We pull rows out of DuckDB (via the data package's
 * `query`) and inject them inline into the spec's `data` block — this keeps
 * the embed bundler-portable and avoids the Mosaic vgplot Vega-Lite bridge,
 * which is more complex to wire.
 */
export function makeVegaLiteComponent(opts: VegaLiteComponentSpec): AnyVisComponentDefinition {
  const stateByController = new WeakMap<AnyVisController, VegaState>();

  return {
    id: opts.id,
    name: opts.name,
    version: opts.version,
    ...(opts.description !== undefined ? { description: opts.description } : {}),
    src: { table: 'table' as const },
    props: [],
    init() {
      if (!this.view) return;
      stateByController.set(this, {});
    },
    async update(_source) {
      if (!this.view) return;
      const state = stateByController.get(this);
      if (!state) return;

      const tableSrc = (this.src)['table'];
      if (!tableSrc || tableSrc.kind !== 'table') return;

      const tableName = tableSrc.tableName;
      const baseSpec =
        typeof opts.spec === 'function' ? opts.spec({ table: tableName }) : opts.spec;

      // Pull rows from DuckDB. Dynamic import keeps this package framework-agnostic.
      const { query } = await import('@vistrates/data');
      const rows = await query(`SELECT * FROM "${tableName.replace(/"/g, '""')}"`);
      const inlineRows = toJsonRows(rows);

      // Default to container-driven width so the chart fits whatever slot
      // it's mounted in. Caller can override by setting an explicit width
      // in the spec.
      const fullSpec: JsonObject = {
        width: 'container',
        background: 'transparent',
        ...baseSpec,
        data: { values: inlineRows },
      };

      const embed = (await import('vega-embed')).default;
      state.view?.finalize();
      const result = await embed(this.view.element, fullSpec, {
        actions: false,
        renderer: 'svg',
        config: themedVegaConfig(),
      });
      state.view = result.view;
    },
    destroy() {
      const state = stateByController.get(this);
      if (state?.view) state.view.finalize();
      stateByController.delete(this);
    },
  } satisfies AnyVisComponentDefinition;
}

function toJsonRows(result: unknown): JsonObject[] {
  // Arrow tables expose toArray(); plain JSON arrays pass through.
  if (Array.isArray(result)) return result as JsonObject[];
  const arr = (result as { toArray?: () => unknown }).toArray?.();
  if (Array.isArray(arr)) return arr as JsonObject[];
  return [];
}

/**
 * Resolve a theme-aware Vega config from the page's CSS variables. Reads
 * `--vs-fg`, `--vs-muted`, `--vs-border` off `<html>` so the chart's text,
 * axis, and grid colors track light/dark.
 */
function themedVegaConfig(): JsonObject {
  if (typeof document === 'undefined') return {};
  const style = getComputedStyle(document.documentElement);
  const fg = style.getPropertyValue('--vs-fg').trim() || '#fff';
  const muted = style.getPropertyValue('--vs-muted').trim() || '#a0a0a0';
  const border = style.getPropertyValue('--vs-border').trim() || '#262626';
  return {
    background: 'transparent',
    font: 'Poppins, sans-serif',
    title: { color: fg, font: 'Poppins, sans-serif' },
    axis: {
      labelColor: muted,
      titleColor: fg,
      domainColor: border,
      tickColor: border,
      gridColor: border,
      labelFont: 'Poppins, sans-serif',
      titleFont: 'Poppins, sans-serif',
    },
    legend: {
      labelColor: fg,
      titleColor: fg,
      labelFont: 'Poppins, sans-serif',
      titleFont: 'Poppins, sans-serif',
    },
    view: { stroke: 'transparent' },
  };
}
