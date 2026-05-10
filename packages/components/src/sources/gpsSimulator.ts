import type { AnyVisComponentDefinition, AnyVisController } from '@vistrates/types';
import {
  describeTable,
  getCoordinator,
  startGpsSimulator,
  type GpsSimulatorHandle,
} from '@vistrates/data';
import { asNumber, asString, readDataObject } from '../dataAccess.js';

interface GpsSimulatorData {
  readonly tableName: string;
  readonly intervalMs?: number;
  readonly agents?: number;
  /**
   * How often to nudge `output` so downstream Mosaic charts re-render
   * with the new rows. Default 1000ms — too fast and vgplot tears down
   * the plot every tick; too slow and the user doesn't perceive the
   * stream as "live". Set 0 to disable nudging entirely (chart will
   * only show the initial snapshot).
   */
  readonly refreshMs?: number;
}

interface GpsSimulatorState {
  handle: GpsSimulatorHandle;
  refreshIntervalId?: ReturnType<typeof setInterval>;
}

const stateByController = new WeakMap<AnyVisController, GpsSimulatorState>();

/**
 * Stream synthetic GPS rows into a DuckDB table on a tick.
 *
 * Mosaic clients fetch on connect and on selection changes — they don't
 * automatically re-poll for fresh rows in a table that's growing under
 * them. To make the chart feel live, this component re-emits its
 * `output` on a slower (1s default) `refreshMs` interval. The runtime's
 * outputChanged event triggers downstream `update()` calls, which in
 * the Mosaic adapter rebuild `vg.plot(...)` with a fresh client that
 * re-queries the table.
 */
export const gpsSimulatorComponent: AnyVisComponentDefinition = {
  id: 'gps-simulator',
  name: 'GPS Simulator',
  version: '0.2.0',
  description: 'Generate live GPS rows into a DuckDB table on a tick.',
  tags: ['source', 'gps', 'live'],
  src: {},
  props: [],
  defaultData: { tableName: 'gps_stream', intervalMs: 200, agents: 3, refreshMs: 1000 },
  async init() {
    const data = readDataObject<GpsSimulatorData>(this);
    const tableName = asString(data.tableName) ?? 'gps_stream';
    const intervalMs = asNumber(data.intervalMs) ?? 200;
    const agents = asNumber(data.agents) ?? 3;
    const refreshMs = asNumber(data.refreshMs) ?? 1000;

    const handle = await startGpsSimulator({ tableName, intervalMs, agents });
    const schema = await describeTable(tableName);
    this.output = { kind: 'table', tableName, schema };

    const state: GpsSimulatorState = { handle };
    if (refreshMs > 0) {
      // Mosaic Coordinator caches query results by SQL string. Since the
      // gps_stream table is mutating under us (rows being INSERTed every
      // tick), the cached results go stale immediately. Clear the cache
      // before nudging the output so downstream charts re-query against
      // the actual current row set.
      const coord = await getCoordinator();
      state.refreshIntervalId = setInterval(() => {
        try {
          coord.clear({ cache: true, clients: false });
        } catch (err: unknown) {
          console.warn('[vistrates] coord.clear failed:', err);
        }
        // Re-emit output to nudge downstream observers — same shape, but
        // a fresh object reference fires outputChanged on the topology
        // bus and the Mosaic adapter re-runs its update() with a fresh
        // (uncached) query.
        this.output = { kind: 'table', tableName, schema };
      }, refreshMs);
    }
    stateByController.set(this, state);
  },
  destroy() {
    const state = stateByController.get(this);
    state?.handle.stop();
    if (state?.refreshIntervalId !== undefined) clearInterval(state.refreshIntervalId);
    stateByController.delete(this);
  },
};
