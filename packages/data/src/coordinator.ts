import { Coordinator, coordinator, wasmConnector } from '@uwdata/mosaic-core';

/**
 * Lazy singleton Mosaic Coordinator backed by DuckDB-WASM.
 *
 * On first call, instantiates a `Coordinator`, attaches a `wasmConnector`
 * (which spins up DuckDB-WASM internally), AND registers it as Mosaic's
 * global default via `coordinator(c)`. The latter is critical — vgplot
 * components call the global `coordinator()` (no args) to find their
 * coordinator. If we don't register, vgplot uses a fresh empty Coordinator
 * with no DB connector, and every chart ends up blank because its query
 * resolves to nothing. (This was the empty-Mosaic-bar bug on Pages.)
 */
let coord: Coordinator | undefined;
let initPromise: Promise<Coordinator> | undefined;

export interface CoordinatorOptions {
  /** Pass `true` to enable verbose Mosaic logging. */
  readonly log?: boolean;
}

export async function getCoordinator(opts: CoordinatorOptions = {}): Promise<Coordinator> {
  if (coord) return coord;
  if (initPromise) return initPromise;
  initPromise = Promise.resolve().then(() => {
    const c = new Coordinator();
    const connector = wasmConnector(opts.log === true ? { log: true } : {});
    c.databaseConnector(connector);
    // Register as Mosaic's global default so vgplot picks it up.
    coordinator(c);
    coord = c;
    return c;
  });
  return initPromise;
}

/** Arrow table or plain JSON rows — narrow at the call site if needed. */
export type QueryResult = unknown;

/** Issue a SQL query against the shared coordinator. Returns Arrow by default. */
export async function query(sql: string): Promise<QueryResult> {
  const c = await getCoordinator();
  return c.query(sql);
}

/** Execute a SQL statement that doesn't return rows (DDL, INSERT, etc). */
export async function exec(sql: string | readonly string[]): Promise<void> {
  const c = await getCoordinator();
  if (typeof sql === 'string') {
    await c.exec(sql);
  } else {
    await c.exec(Array.from(sql));
  }
}

/** Reset the coordinator (test/dev only). */
export function _resetCoordinatorForTesting(): void {
  coord = undefined;
  initPromise = undefined;
}
