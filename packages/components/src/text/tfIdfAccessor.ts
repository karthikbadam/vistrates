import type { AnyVisComponentDefinition } from '@vistrates/types';
import { describeTable, exec } from '@vistrates/data';
import { asNumber, asString, readDataObject } from '../dataAccess.js';

interface TfIdfAccessorData {
  readonly viewName: string;
  readonly topK?: number;
  readonly docId?: string;
}

/**
 * Read top-k TF-IDF terms (optionally for a specific document) from an
 * upstream `tfidf` table. Outputs a smaller table for charting/word-cloud
 * components downstream.
 */
export const tfIdfAccessorComponent: AnyVisComponentDefinition = {
  id: 'tfidf-accessor',
  name: 'TF-IDF Accessor',
  version: '0.1.0',
  description: 'Pull top-k TF-IDF terms (optionally per document).',
  tags: ['text'],
  src: { in: 'table' },
  props: [],
  defaultData: { viewName: 'tfidf_top', topK: 100 },
  async update(_source) {
    const inSrc = (this.src)['in'];
    if (!inSrc || inSrc.kind !== 'table') return;
    const data = readDataObject<TfIdfAccessorData>(this);
    const viewName = asString(data.viewName) ?? 'tfidf_top';
    const topK = asNumber(data.topK) ?? 100;
    const docId = asString(data.docId);
    const safeFrom = inSrc.tableName.replace(/"/g, '""');
    const safeTo = viewName.replace(/"/g, '""');
    const where = docId !== undefined ? ` WHERE doc_id = '${docId.replace(/'/g, "''")}'` : '';
    const sql = `CREATE OR REPLACE VIEW "${safeTo}" AS
      SELECT * FROM "${safeFrom}"${where}
      ORDER BY tfidf DESC
      LIMIT ${Math.max(1, topK)}`;
    await exec(sql);
    const schema = await describeTable(viewName);
    this.output = { kind: 'table', tableName: viewName, schema };
  },
};
