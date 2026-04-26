import type { AnyVisComponentDefinition, ComponentOutput } from '@vistrates/types';
import { buildFilterSQL, describeTable, exec } from '@vistrates/data';
import { asString, readDataObject } from '../dataAccess.js';

interface FilterData {
  readonly viewName: string;
}

/**
 * Apply an InteractionClause from `src.selection` as a SQL WHERE against
 * the `src.in` table. Re-creates a view; outputs that view as a new table.
 */
export const filterComponent: AnyVisComponentDefinition = {
  id: 'filter',
  name: 'Filter',
  version: '0.1.0',
  description: 'Filter a table by an upstream selection clause.',
  tags: ['processing'],
  src: { in: 'table', selection: 'clause' },
  props: [],
  defaultData: { viewName: 'filter_out' },
  async update(_source) {
    const inSrc = (this.src as Readonly<Record<string, ComponentOutput | null>>)['in'];
    if (!inSrc || inSrc.kind !== 'table') return;
    const data = readDataObject<FilterData>(this);
    const viewName = asString(data.viewName) ?? 'filter_out';
    const selSrc = (this.src as Readonly<Record<string, ComponentOutput | null>>)['selection'];
    const clause = selSrc?.kind === 'clause' ? selSrc.clause : undefined;
    const sql = buildFilterSQL({ fromTable: inSrc.tableName, toTable: viewName, clause });
    await exec(sql);
    const schema = await describeTable(viewName);
    this.output = { kind: 'table', tableName: viewName, schema };
  },
};
