import type { AnyVisComponentDefinition, AnyVisController } from '@vistrates/types';
import { Selection } from '@uwdata/mosaic-core';

/** Per-controller Selection so multiple instances on a page each get their own. */
const selectionByController = new WeakMap<AnyVisController, Selection>();

/**
 * A first-class "linked selection" node in the dataflow graph.
 *
 * Wire this paragraph as `src.selection` on multiple Mosaic vgplot charts
 * and the runtime resolves the same `Selection.crossfilter()` instance
 * into every consumer — brushing one chart cross-filters the rest. This
 * is the original Vistrates pattern: shared coordination state lives as
 * its own component on the pipeline graph, not as a magic global.
 *
 * Output kind: `'selection'` — adapters narrow the opaque value back to
 * a Mosaic `Selection` at the consumption site.
 */
export const crossfilterSelectionComponent: AnyVisComponentDefinition = {
  id: 'crossfilter-selection',
  name: 'Crossfilter Selection',
  version: '0.1.0',
  description:
    'A shared Mosaic crossfilter Selection. Wire it into `src.selection` on multiple charts to link their brushes.',
  tags: ['selection', 'coordination'],
  src: {},
  props: [],
  init() {
    let selection = selectionByController.get(this);
    if (!selection) {
      selection = Selection.crossfilter();
      selectionByController.set(this, selection);
    }
    this.output = { kind: 'selection', selection };
  },
  destroy() {
    selectionByController.delete(this);
  },
};

/**
 * Variant: a single-selection coordination node (point/interval, single
 * active clause at a time). Useful for radio-button-style filtering
 * where only one chart's brush is active at once.
 */
export const singleSelectionComponent: AnyVisComponentDefinition = {
  id: 'single-selection',
  name: 'Single Selection',
  version: '0.1.0',
  description: 'A shared Mosaic single Selection (only the most recent clause is active).',
  tags: ['selection', 'coordination'],
  src: {},
  props: [],
  init() {
    let selection = selectionByController.get(this);
    if (!selection) {
      selection = Selection.single();
      selectionByController.set(this, selection);
    }
    this.output = { kind: 'selection', selection };
  },
  destroy() {
    selectionByController.delete(this);
  },
};
