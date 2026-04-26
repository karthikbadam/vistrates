import type { AnyVisComponentDefinition } from '@vistrates/types';
import { buildDateFilterSQL, describeTable, exec } from '@vistrates/data';
import { asString, readDataObject } from '../dataAccess.js';

interface DateFilterData {
  readonly viewName: string;
  readonly column: string;
  readonly start?: string;
  readonly end?: string;
}

/** Filter a table to a half-open date range `[start, end)`. */
export const dateFilterComponent: AnyVisComponentDefinition = {
  id: 'date-filter',
  name: 'Date Filter',
  version: '0.1.0',
  description: 'Filter a table by a half-open timestamp range.',
  tags: ['processing'],
  src: { in: 'table' },
  props: [],
  defaultData: { viewName: 'datefilter_out', column: 'ts' },
  async update(_source) {
    const inSrc = (this.src)['in'];
    if (!inSrc || inSrc.kind !== 'table') return;
    const data = readDataObject<DateFilterData>(this);
    const viewName = asString(data.viewName) ?? 'datefilter_out';
    const column = asString(data.column);
    if (!column) return;
    const params = {
      fromTable: inSrc.tableName,
      toTable: viewName,
      column,
      ...(asString(data.start) !== undefined ? { start: asString(data.start) as string } : {}),
      ...(asString(data.end) !== undefined ? { end: asString(data.end) as string } : {}),
    };
    await exec(buildDateFilterSQL(params));
    const schema = await describeTable(viewName);
    this.output = { kind: 'table', tableName: viewName, schema };
  },
};
