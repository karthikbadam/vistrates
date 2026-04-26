import type { AnyVisComponentDefinition } from '@vistrates/types';
import {
  csvLoaderComponent,
  gpsSimulatorComponent,
  queryableCsvComponent,
  queryableParquetComponent,
} from './sources/index.js';
import {
  dateFilterComponent,
  filterComponent,
  filterJoinComponent,
  gpsFilterComponent,
  groupbyAverageComponent,
  simpleJoinComponent,
} from './processing/index.js';
import {
  tfIdfAccessorComponent,
  tfIdfAnalyzerComponent,
  wordFrequencyAnalyzerComponent,
} from './text/index.js';

/**
 * Built-in components shipped in v1.
 *
 * Visualization adapters (Mosaic / Semiotic / Vega-Lite / DOM) are not in
 * this list — they are factory functions, not static defs. Demo docs
 * register adapter outputs alongside these built-ins.
 */
export const builtinComponents: readonly AnyVisComponentDefinition[] = [
  // sources
  csvLoaderComponent,
  queryableCsvComponent,
  queryableParquetComponent,
  gpsSimulatorComponent,
  // processing
  filterComponent,
  simpleJoinComponent,
  filterJoinComponent,
  groupbyAverageComponent,
  dateFilterComponent,
  gpsFilterComponent,
  // text
  wordFrequencyAnalyzerComponent,
  tfIdfAnalyzerComponent,
  tfIdfAccessorComponent,
];

/** Register every built-in into a Vistrates Runtime. Idempotent on re-call. */
export function registerBuiltins(rt: {
  hasDefinition: (id: string) => boolean;
  registerDefinition: (def: AnyVisComponentDefinition) => void;
}): void {
  for (const def of builtinComponents) {
    if (!rt.hasDefinition(def.id)) rt.registerDefinition(def);
  }
}
