import type { AnyVisComponentDefinition } from '@vistrates/types';
import { describeTable } from '@vistrates/data';
import { asString, readDataObject } from '../dataAccess.js';

interface QueryableCsvData {
  readonly tableName: string;
}

/**
 * Treat an existing DuckDB table as a Vistrates source.
 *
 * Useful when you've already populated a table out-of-band (server preload,
 * another component) and just want to expose it as the output of a paragraph.
 */
export const queryableCsvComponent: AnyVisComponentDefinition = {
  id: 'queryable-csv',
  name: 'Queryable CSV',
  version: '0.1.0',
  description: 'Expose an existing DuckDB table as a Vistrates `table` output.',
  tags: ['source'],
  src: {},
  props: [],
  defaultData: { tableName: 'iris' },
  async init() {
    const data = readDataObject<QueryableCsvData>(this);
    const tableName = asString(data.tableName);
    if (!tableName) return;
    const schema = await describeTable(tableName);
    this.output = { kind: 'table', tableName, schema };
  },
};
