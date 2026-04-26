import { createElement, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type {
  AnyVisComponentDefinition,
  AnyVisController,
  ComponentOutput,
  InteractionClause,
  JsonObject,
} from '@vistrates/types';
import { asPredicate } from '@vistrates/types';

export interface SemioticBuildArgs {
  readonly rows: readonly JsonObject[];
  readonly emitClause: (clause: InteractionClause) => void;
}

/** Generic Semiotic frame: XYFrame, OrdinalFrame, NetworkFrame, etc. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Semiotic's frames are ComponentType<unknown>; we narrow at use site
export type SemioticFrame = ComponentType<any>;

export interface SemioticComponentSpec {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  /** Semiotic frame component class (default-import from `semiotic`). */
  readonly frame: SemioticFrame;
  /** Build the Semiotic frame's props from the upstream rows. */
  readonly propsBuilder: (args: SemioticBuildArgs) => Readonly<Record<string, unknown>>;
}

interface SemioticState {
  root: Root;
}

/**
 * Wrap any Semiotic frame into a Vistrates component.
 *
 * Renders inside a React root mounted on `view.element`. The user's
 * `propsBuilder` receives the rows fetched from DuckDB plus an
 * `emitClause` callback they can wire to Semiotic's `customClickBehavior`
 * / `pieceHoverAnnotation` / etc. to translate Semiotic events into
 * Vistrates `InteractionClause`s.
 */
export function makeSemioticComponent(opts: SemioticComponentSpec): AnyVisComponentDefinition {
  const stateByController = new WeakMap<AnyVisController, SemioticState>();

  return {
    id: opts.id,
    name: opts.name,
    version: opts.version,
    ...(opts.description !== undefined ? { description: opts.description } : {}),
    src: { table: 'table' as const },
    props: [],
    init() {
      if (!this.view) return;
      const root = createRoot(this.view.element);
      stateByController.set(this, { root });
    },
    async update(_source) {
      if (!this.view) return;
      const state = stateByController.get(this);
      if (!state) return;

      const tableSrc = (this.src as Readonly<Record<string, ComponentOutput | null>>)['table'];
      if (!tableSrc || tableSrc.kind !== 'table') return;

      const { query } = await import('@vistrates/data');
      const rows = await query(`SELECT * FROM "${tableSrc.tableName.replace(/"/g, '""')}"`);
      const inlineRows = toJsonRows(rows);

      const ctlId = this.id;
      const props = opts.propsBuilder({
        rows: inlineRows,
        emitClause: (partial) => {
          const filled: InteractionClause = {
            source: ctlId,
            clients: [],
            predicate: partial.predicate ?? asPredicate('TRUE'),
            value: partial.value,
            schema: partial.schema,
          };
          this.emitClause(filled);
        },
      });
      state.root.render(createElement(opts.frame, props));
    },
    destroy() {
      const state = stateByController.get(this);
      state?.root.unmount();
      stateByController.delete(this);
    },
  } satisfies AnyVisComponentDefinition;
}

function toJsonRows(result: unknown): JsonObject[] {
  if (Array.isArray(result)) return result as JsonObject[];
  const arr = (result as { toArray?: () => unknown }).toArray?.();
  if (Array.isArray(arr)) return arr as JsonObject[];
  return [];
}
