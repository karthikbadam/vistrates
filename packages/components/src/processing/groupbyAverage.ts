import type { AnyVisComponentDefinition, ComponentOutput, JsonValue } from '@vistrates/types';
import { buildGroupBySQL, describeTable, exec } from '@vistrates/data';
import { asString, readDataObject } from '../dataAccess.js';

interface GroupByAverageData {
  readonly viewName: string;
  readonly groupBy: readonly string[];
  readonly aggregates: ReadonlyArray<{
    readonly column: string;
    readonly fn: 'avg' | 'sum' | 'count' | 'min' | 'max';
    readonly as?: string;
  }>;
}

function isAggArray(v: JsonValue | undefined): v is JsonValue[] {
  return Array.isArray(v);
}

/** Aggregate by group: SQL `SELECT g..., agg(col) FROM tab GROUP BY g...`. */
export const groupbyAverageComponent: AnyVisComponentDefinition = {
  id: 'groupby-average',
  name: 'Group By + Aggregate',
  version: '0.1.0',
  description: 'GROUP BY one or more columns with arbitrary aggregates (avg, sum, …).',
  tags: ['processing', 'aggregate'],
  src: { in: 'table' },
  props: [],
  defaultData: { viewName: 'groupby_out', groupBy: [], aggregates: [] },
  async update(_source) {
    const inSrc = (this.src as Readonly<Record<string, ComponentOutput | null>>)['in'];
    if (!inSrc || inSrc.kind !== 'table') return;
    const data = readDataObject<GroupByAverageData>(this);
    const viewName = asString(data.viewName) ?? 'groupby_out';
    const groupBy = (Array.isArray(data.groupBy) ? data.groupBy : []).filter(
      (s): s is string => typeof s === 'string',
    );
    const aggregates: GroupByAverageData['aggregates'] = isAggArray(data.aggregates)
      ? (data.aggregates.filter((a) => {
          if (typeof a !== 'object' || a === null) return false;
          const o = a as Record<string, JsonValue>;
          return typeof o['column'] === 'string' && typeof o['fn'] === 'string';
        }) as unknown as GroupByAverageData['aggregates'])
      : [];
    if (groupBy.length === 0 && aggregates.length === 0) return;
    await exec(
      buildGroupBySQL({ fromTable: inSrc.tableName, toTable: viewName, groupBy, aggregates }),
    );
    const schema = await describeTable(viewName);
    this.output = { kind: 'table', tableName: viewName, schema };
  },
};
