import { Coordinator, wasmConnector } from '@uwdata/mosaic-core';

/**
 * Lazy singleton Mosaic Coordinator backed by DuckDB-WASM.
 *
 * On first call, instantiates a `Coordinator` and attaches a `wasmConnector`
 * (which spins up DuckDB-WASM internally). Subsequent calls return the same
 * instance so all components in the page share one DB.
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
  initPromise = (async () => {
    const c = new Coordinator();
    const connector = wasmConnector(opts.log === true ? { log: true } : {});
    c.databaseConnector(connector);
    coord = c;
    return c;
  })();
  return initPromise;
}

export type ArrowTable = unknown; // we narrow at the call site with isArrowTable
export type QueryResult = ArrowTable | { readonly [k: string]: unknown }[];

/** Issue a SQL query against the shared coordinator. Returns Arrow by default. */
export async function query(sql: string): Promise<QueryResult> {
  const c = await getCoordinator();
  return c.query(sql) as Promise<QueryResult>;
}

/** Execute a SQL statement that doesn't return rows (DDL, INSERT, etc). */
export async function exec(sql: string | readonly string[]): Promise<void> {
  const c = await getCoordinator();
  await c.exec(Array.isArray(sql) ? (sql as string[]) : (sql as string));
}

/** Reset the coordinator (test/dev only). */
export function _resetCoordinatorForTesting(): void {
  coord = undefined;
  initPromise = undefined;
}
