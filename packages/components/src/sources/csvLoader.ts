import type { AnyVisComponentDefinition } from '@vistrates/types';
import { describeTable, exec, loadCsvFromText, loadCsvFromUrl } from '@vistrates/data';
import { asString, readDataObject } from '../dataAccess.js';

interface CsvLoaderData {
  readonly url?: string;
  readonly text?: string;
  readonly tableName: string;
}

/**
 * Ingest a CSV (from URL or raw text) into a DuckDB table.
 * Outputs a `{ kind: 'table' }` so downstream components can SELECT from it.
 */
export const csvLoaderComponent: AnyVisComponentDefinition = {
  id: 'csv-loader',
  name: 'CSV Loader',
  version: '0.1.0',
  description: 'Load a CSV file (URL or raw text) into a DuckDB table.',
  tags: ['source', 'csv'],
  src: {},
  props: [],
  defaultData: { tableName: 'csv_loaded' },
  async init() {
    const data = readDataObject<CsvLoaderData>(this);
    const tableName = asString(data.tableName) ?? 'csv_loaded';
    const url = asString(data.url);
    const text = asString(data.text);
    if (url) {
      await loadCsvFromUrl(tableName, url);
    } else if (text !== undefined) {
      await loadCsvFromText(tableName, text);
    } else {
      // Nothing to do yet — wait until data.url or data.text is set.
      return;
    }
    const schema = await describeTable(tableName);
    this.output = { kind: 'table', tableName, schema };
  },
  destroy() {
    const data = readDataObject<CsvLoaderData>(this);
    const tableName = asString(data.tableName);
    if (tableName) {
      void exec(`DROP TABLE IF EXISTS "${tableName.replace(/"/g, '""')}"`);
    }
  },
};
