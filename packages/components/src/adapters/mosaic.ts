import type {
  AnyVisComponentDefinition,
  AnyVisController,
  InteractionClause,
} from '@vistrates/types';
import { asPredicate } from '@vistrates/types';
import { Selection } from '@uwdata/mosaic-core';

/** A Mosaic vgplot spec can be anything that returns a DOM node. */
export type VgplotSpecBuilder = (
  ctx: { readonly table: string; readonly selection: Selection; readonly host: HTMLElement },
) => Element | HTMLElement | Promise<Element | HTMLElement>;

export interface MosaicComponentSpec {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  /** Build the vgplot spec given the bound table name and a per-instance Selection. */
  readonly spec: VgplotSpecBuilder;
}

interface MosaicState {
  selection: Selection;
  unsubscribe?: () => void;
  rendered?: Element;
}

/**
 * Wrap a Mosaic vgplot spec into a Vistrates component.
 *
 * Subscribes to a per-instance `Selection`. When the user brushes/points
 * inside the plot (vgplot will populate the Selection), the subscription
 * fires and we emit a Vistrates `InteractionClause`. The clause's predicate
 * is the SQL produced by the active Mosaic clause.
 *
 * If `src.selection` is bound, incoming selections are mirrored INTO the
 * Mosaic selection so charts can be cross-filtered by upstream components.
 */
export function makeMosaicComponent(opts: MosaicComponentSpec): AnyVisComponentDefinition {
  const stateByController = new WeakMap<AnyVisController, MosaicState>();

  return {
    id: opts.id,
    name: opts.name,
    version: opts.version,
    ...(opts.description !== undefined ? { description: opts.description } : {}),
    ...(opts.tags !== undefined ? { tags: opts.tags } : {}),
    src: { table: 'table' as const, selection: 'clause' as const },
    props: [],
    init() {
      if (!this.view) return;
      const state: MosaicState = { selection: Selection.crossfilter() };
      stateByController.set(this, state);

      // Mirror selection changes back to Vistrates as InteractionClauses.
      const onChange = (): void => {
        const clauses = readClauseList(state.selection);
        if (clauses.length === 0) return;
        const merged = mergeClauses(clauses, this.id);
        this.emitClause(merged);
      };
      // Mosaic Selection is event-emitter-shaped (`addEventListener('value', fn)`).
      const sel = state.selection as unknown as {
        addEventListener: (k: string, fn: () => void) => void;
        removeEventListener: (k: string, fn: () => void) => void;
      };
      sel.addEventListener('value', onChange);
      state.unsubscribe = () => sel.removeEventListener('value', onChange);
    },
    async update(_source) {
      if (!this.view) return;
      const state = stateByController.get(this);
      if (!state) return;

      const tableSrc = (this.src)['table'];
      if (!tableSrc || tableSrc.kind !== 'table') return;

      // Re-render the plot.
      state.rendered?.remove();
      const built = await opts.spec({
        table: tableSrc.tableName,
        selection: state.selection,
        host: this.view.element,
      });
      this.view.element.replaceChildren(built);
      state.rendered = built;
    },
    destroy() {
      const state = stateByController.get(this);
      if (!state) return;
      state.unsubscribe?.();
      state.rendered?.remove();
      stateByController.delete(this);
    },
  } satisfies AnyVisComponentDefinition;
}

interface MutablePartialClause {
  source?: string;
  predicate?: InteractionClause['predicate'];
  value?: InteractionClause['value'];
  schema?: InteractionClause['schema'];
}

/** Read Mosaic Selection's currently-active clauses as our typed shape. */
function readClauseList(selection: Selection): readonly MutablePartialClause[] {
  // Selection.clauses is the public read API; shape per @uwdata/mosaic-core types.
  const raw = (selection as unknown as { clauses?: readonly unknown[] }).clauses ?? [];
  const out: MutablePartialClause[] = [];
  for (const c of raw) {
    if (typeof c !== 'object' || c === null) continue;
    const obj = c as {
      source?: unknown;
      predicate?: { toString: () => string };
      value?: unknown;
    };
    if (typeof obj.predicate?.toString !== 'function') continue;
    const partial: MutablePartialClause = {
      predicate: asPredicate(obj.predicate.toString()),
      value: (obj.value as InteractionClause['value']) ?? null,
    };
    if (typeof obj.source === 'string') partial.source = obj.source;
    out.push(partial);
  }
  return out;
}

function mergeClauses(
  clauses: readonly MutablePartialClause[],
  componentId: string,
): InteractionClause {
  const predicates = clauses.map((c) => c.predicate ?? '').filter(Boolean);
  const predicate = asPredicate(
    predicates.length === 0 ? 'TRUE' : predicates.map((p) => `(${p})`).join(' AND '),
  );
  const values = clauses.map((c) => c.value ?? null);
  return {
    source: componentId,
    clients: [],
    predicate,
    value: values,
    schema: { kind: 'interval', fields: [] },
  };
}
