import type { AnyVisComponentDefinition } from '@vistrates/types';
import { describeTable, loadParquetFromUrl, viewParquetFromUrl } from '@vistrates/data';
import { asString, readDataObject } from '../dataAccess.js';

interface QueryableParquetData {
  readonly url: string;
  readonly tableName: string;
  readonly mode?: 'view' | 'table';
}

/**
 * Load a Parquet file (https URL via DuckDB httpfs) and expose it as a
 * `table`. `mode: 'view'` is faster for very large files since DuckDB will
 * issue HTTP range requests rather than materializing the whole table.
 */
export const queryableParquetComponent: AnyVisComponentDefinition = {
  id: 'queryable-parquet',
  name: 'Queryable Parquet',
  version: '0.1.0',
  description: 'Read a Parquet file (URL via httpfs) into a DuckDB table or view.',
  tags: ['source', 'parquet'],
  src: {},
  props: [],
  defaultData: { url: '', tableName: 'parquet_loaded', mode: 'table' },
  async init() {
    const data = readDataObject<QueryableParquetData>(this);
    const url = asString(data.url);
    const tableName = asString(data.tableName) ?? 'parquet_loaded';
    const mode = data.mode === 'view' ? 'view' : 'table';
    if (!url) return;
    if (mode === 'view') {
      await viewParquetFromUrl(tableName, url);
    } else {
      await loadParquetFromUrl(tableName, url);
    }
    const schema = await describeTable(tableName);
    this.output = { kind: 'table', tableName, schema };
  },
};
