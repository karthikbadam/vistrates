import { exec, query } from './coordinator.js';
import type { TableSchema } from '@vistrates/types';

/** Quote a SQL identifier (table or column). */
export function ident(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}

/** Quote a SQL string literal. */
export function strLit(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

/**
 * Create a DuckDB table from a remote (or local-served) CSV URL.
 * `tableName` is the new DuckDB table name; `url` should resolve from the
 * page's origin or be a fully qualified https URL accessible via httpfs.
 */
export async function loadCsvFromUrl(tableName: string, url: string): Promise<void> {
  const sql = `CREATE OR REPLACE TABLE ${ident(tableName)} AS SELECT * FROM read_csv_auto(${strLit(url)})`;
  await exec(sql);
}

/**
 * Load CSV from raw text. We register a virtual file via DuckDB-WASM's
 * file-registration API, then COPY into a table.
 *
 * IMPORTANT: the wasm connector's underlying DuckDB instance is initialized
 * LAZILY — `connector._db` is `undefined` until the first query fires.
 * We must call the public async `getDuckDB()` method (or `getConnection()`)
 * to trigger initialization. Using `_db` directly is a bug — it returns
 * undefined on first use and throws.
 */
export async function loadCsvFromText(tableName: string, text: string): Promise<void> {
  const fileName = `_inline_${tableName}_${Date.now()}.csv`;
  const { getCoordinator } = await import('./coordinator.js');
  const coord = await getCoordinator();
  const connector = coord.databaseConnector() as unknown as {
    getDuckDB?: () => Promise<{ registerFileText: (name: string, content: string) => Promise<void> }>;
  };
  if (typeof connector.getDuckDB !== 'function') {
    throw new Error(
      'loadCsvFromText: DuckDB-WASM connector lacks getDuckDB(); is the coordinator using wasmConnector?',
    );
  }
  const db = await connector.getDuckDB();
  await db.registerFileText(fileName, text);
  await loadCsvFromUrl(tableName, fileName);
}

/** Describe a DuckDB table; returns a `TableSchema`. */
export async function describeTable(tableName: string): Promise<TableSchema> {
  const sql = `DESCRIBE ${ident(tableName)}`;
  const result = await query(sql);
  const columns: Array<{ name: string; type: string }> = [];
  // Mosaic returns Arrow tables; we iterate via toArray() if available.
  const arr = result as {
    toArray?: () => Array<{ column_name?: string; column_type?: string }>;
  };
  if (typeof arr.toArray === 'function') {
    for (const row of arr.toArray()) {
      if (typeof row.column_name === 'string' && typeof row.column_type === 'string') {
        columns.push({ name: row.column_name, type: row.column_type });
      }
    }
  } else if (Array.isArray(result)) {
    for (const row of result) {
      const r = row as { column_name?: string; column_type?: string };
      if (typeof r.column_name === 'string' && typeof r.column_type === 'string') {
        columns.push({ name: r.column_name, type: r.column_type });
      }
    }
  }
  const countResult = await query(`SELECT count(*) AS n FROM ${ident(tableName)}`);
  let rowCount: number | undefined;
  const rows = (countResult as { toArray?: () => Array<{ n?: bigint | number }> }).toArray?.();
  if (rows && rows.length > 0) {
    const n = rows[0]?.n;
    if (typeof n === 'bigint') rowCount = Number(n);
    else if (typeof n === 'number') rowCount = n;
  }
  return { name: tableName, columns, ...(rowCount !== undefined ? { rowCount } : {}) };
}
