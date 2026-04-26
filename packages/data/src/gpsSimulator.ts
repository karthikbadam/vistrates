import { exec } from './coordinator.js';
import { ident, strLit } from './csv.js';

export interface GpsSimulatorOptions {
  readonly tableName: string;
  /** Tick interval in ms. Default 100ms (~10 rows/sec). */
  readonly intervalMs?: number;
  /** Total ticks before auto-stop. Default Infinity. */
  readonly maxTicks?: number;
  /** Number of agents to simulate. Default 1. */
  readonly agents?: number;
  /** Starting time as ISO string. Default `new Date().toISOString()`. */
  readonly startTime?: string;
}

export interface GpsSimulatorHandle {
  readonly stop: () => void;
  readonly tickCount: () => number;
}

/**
 * Spin up a tickable GPS row generator that INSERTs into a DuckDB table.
 *
 * Schema:  id INTEGER, lat DOUBLE, lon DOUBLE, t TIMESTAMP
 *
 * Agents drift in randomized small steps. Suitable for live demos and tests
 * of the reactive update path. Single-threaded — Web Worker is a future
 * enhancement; for v1, the work is small enough not to block the UI.
 */
export async function startGpsSimulator(
  opts: GpsSimulatorOptions,
): Promise<GpsSimulatorHandle> {
  const interval = opts.intervalMs ?? 100;
  const max = opts.maxTicks ?? Number.POSITIVE_INFINITY;
  const agents = Math.max(1, opts.agents ?? 1);
  const t0 = new Date(opts.startTime ?? Date.now()).getTime();

  await exec(
    `CREATE TABLE IF NOT EXISTS ${ident(opts.tableName)} (id INTEGER, lat DOUBLE, lon DOUBLE, t TIMESTAMP)`,
  );

  const lat = new Array<number>(agents).fill(0).map(() => 47.6 + Math.random() * 0.1);
  const lon = new Array<number>(agents).fill(0).map(() => -122.3 + Math.random() * 0.1);

  let ticks = 0;
  let stopped = false;

  const handle: GpsSimulatorHandle = {
    stop: () => {
      stopped = true;
    },
    tickCount: () => ticks,
  };

  const tick = async (): Promise<void> => {
    if (stopped || ticks >= max) return;
    const rows: string[] = [];
    const tNow = new Date(t0 + ticks * interval).toISOString();
    for (let i = 0; i < agents; i++) {
      const oldLat = lat[i] ?? 0;
      const oldLon = lon[i] ?? 0;
      const newLat = oldLat + (Math.random() - 0.5) * 0.001;
      const newLon = oldLon + (Math.random() - 0.5) * 0.001;
      lat[i] = newLat;
      lon[i] = newLon;
      rows.push(`(${i}, ${newLat}, ${newLon}, ${strLit(tNow)}::TIMESTAMP)`);
    }
    if (rows.length > 0) {
      await exec(`INSERT INTO ${ident(opts.tableName)} VALUES ${rows.join(',')}`);
    }
    ticks++;
    if (!stopped && ticks < max) {
      setTimeout(() => {
        void tick();
      }, interval);
    }
  };
  void tick();

  return handle;
}
