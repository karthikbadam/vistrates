import type { AnyVisComponentDefinition, ComponentOutput } from '@vistrates/types';
import { describeTable, exec } from '@vistrates/data';
import { asString, readDataObject } from '../dataAccess.js';

interface TfIdfData {
  readonly column: string;
  readonly docIdColumn: string;
  readonly viewName: string;
}

/**
 * Compute TF-IDF over a text column. Output schema:
 *   (doc_id, word VARCHAR, tf DOUBLE, idf DOUBLE, tfidf DOUBLE)
 *
 * Pure DuckDB — uses CTEs to compute term frequency per document and
 * inverse document frequency across the corpus.
 */
export const tfIdfAnalyzerComponent: AnyVisComponentDefinition = {
  id: 'tfidf-analyzer',
  name: 'TF-IDF Analyzer',
  version: '0.1.0',
  description: 'Compute TF-IDF for a text column, joining document IDs.',
  tags: ['text'],
  src: { in: 'table' },
  props: [],
  defaultData: { column: 'text', docIdColumn: 'id', viewName: 'tfidf' },
  async update(_source) {
    const inSrc = (this.src as Readonly<Record<string, ComponentOutput | null>>)['in'];
    if (!inSrc || inSrc.kind !== 'table') return;
    const data = readDataObject<TfIdfData>(this);
    const column = (asString(data.column) ?? 'text').replace(/"/g, '""');
    const docIdColumn = (asString(data.docIdColumn) ?? 'id').replace(/"/g, '""');
    const viewName = asString(data.viewName) ?? 'tfidf';
    const safeFrom = inSrc.tableName.replace(/"/g, '""');
    const safeTo = viewName.replace(/"/g, '""');
    const sql = `CREATE OR REPLACE VIEW "${safeTo}" AS
      WITH tokens AS (
        SELECT
          "${docIdColumn}" AS doc_id,
          lower(regexp_replace(unnest(regexp_split_to_array("${column}", '\\s+')), '[^a-z0-9]', '', 'g')) AS word
        FROM "${safeFrom}"
      ),
      filtered AS (SELECT * FROM tokens WHERE length(word) > 0),
      doc_counts AS (SELECT count(DISTINCT doc_id) AS n FROM filtered),
      term_doc AS (
        SELECT doc_id, word, count(*) AS freq
        FROM filtered
        GROUP BY doc_id, word
      ),
      doc_size AS (
        SELECT doc_id, sum(freq) AS total
        FROM term_doc GROUP BY doc_id
      ),
      idf AS (
        SELECT word, ln((SELECT n FROM doc_counts) / count(DISTINCT doc_id)::DOUBLE) AS idf
        FROM term_doc GROUP BY word
      )
      SELECT
        td.doc_id,
        td.word,
        td.freq::DOUBLE / ds.total AS tf,
        idf.idf,
        (td.freq::DOUBLE / ds.total) * idf.idf AS tfidf
      FROM term_doc td
      JOIN doc_size ds ON td.doc_id = ds.doc_id
      JOIN idf ON td.word = idf.word
      ORDER BY tfidf DESC`;
    await exec(sql);
    const schema = await describeTable(viewName);
    this.output = { kind: 'table', tableName: viewName, schema };
  },
};
