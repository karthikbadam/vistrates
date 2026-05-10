import { exec } from './coordinator.js';
import { ident, strLit } from './csv.js';

/**
 * Load a Parquet file (local-served or remote httpfs URL) into a DuckDB table.
 * DuckDB-WASM autoloads the `httpfs` extension when reading https URLs.
 */
export async function loadParquetFromUrl(tableName: string, url: string): Promise<void> {
  const sql = `CREATE OR REPLACE TABLE ${ident(tableName)} AS SELECT * FROM read_parquet(${strLit(url)})`;
  await exec(sql);
}

/**
 * Build a queryable view over a remote Parquet without materializing into a table.
 * Faster for huge datasets — DuckDB will issue HTTP range requests for slices.
 */
export async function viewParquetFromUrl(viewName: string, url: string): Promise<void> {
  const sql = `CREATE OR REPLACE VIEW ${ident(viewName)} AS SELECT * FROM read_parquet(${strLit(url)})`;
  await exec(sql);
}
