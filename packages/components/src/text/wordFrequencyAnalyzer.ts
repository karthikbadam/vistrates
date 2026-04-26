import type { AnyVisComponentDefinition, ComponentOutput } from '@vistrates/types';
import { describeTable, exec } from '@vistrates/data';
import { asString, readDataObject } from '../dataAccess.js';

interface WordFrequencyData {
  readonly column: string;
  readonly viewName: string;
  readonly limit?: number;
}

/**
 * Tokenize a text column and count word occurrences.
 * Implementation is pure DuckDB SQL — `regexp_split_to_array` + `unnest`
 * + GROUP BY. Outputs a table with columns `(word VARCHAR, count BIGINT)`.
 */
export const wordFrequencyAnalyzerComponent: AnyVisComponentDefinition = {
  id: 'word-frequency-analyzer',
  name: 'Word Frequency Analyzer',
  version: '0.1.0',
  description: 'Count word occurrences in a text column.',
  tags: ['text'],
  src: { in: 'table' },
  props: [],
  defaultData: { column: 'text', viewName: 'word_freq' },
  async update(_source) {
    const inSrc = (this.src as Readonly<Record<string, ComponentOutput | null>>)['in'];
    if (!inSrc || inSrc.kind !== 'table') return;
    const data = readDataObject<WordFrequencyData>(this);
    const column = asString(data.column) ?? 'text';
    const viewName = asString(data.viewName) ?? 'word_freq';
    const limit = typeof data.limit === 'number' ? Math.max(1, data.limit) : 1000;
    const safeCol = column.replace(/"/g, '""');
    const safeFrom = inSrc.tableName.replace(/"/g, '""');
    const safeTo = viewName.replace(/"/g, '""');
    const sql = `CREATE OR REPLACE VIEW "${safeTo}" AS
      SELECT word, count(*) AS count
      FROM (
        SELECT lower(regexp_replace(unnest(regexp_split_to_array("${safeCol}", '\\s+')), '[^a-z0-9]', '', 'g')) AS word
        FROM "${safeFrom}"
      )
      WHERE length(word) > 0
      GROUP BY word
      ORDER BY count DESC
      LIMIT ${limit}`;
    await exec(sql);
    const schema = await describeTable(viewName);
    this.output = { kind: 'table', tableName: viewName, schema };
  },
};
