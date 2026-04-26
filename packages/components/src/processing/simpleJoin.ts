import type { AnyVisComponentDefinition, ComponentOutput } from '@vistrates/types';
import { buildSimpleJoinSQL, describeTable, exec } from '@vistrates/data';
import { asString, readDataObject } from '../dataAccess.js';

interface SimpleJoinData {
  readonly leftKey: string;
  readonly rightKey: string;
  readonly viewName: string;
  readonly kind?: 'inner' | 'left' | 'right' | 'full';
}

/** Inner-join two upstream tables on a key column from each side. */
export const simpleJoinComponent: AnyVisComponentDefinition = {
  id: 'simple-join',
  name: 'Simple Join',
  version: '0.1.0',
  description: 'Join two tables on a single key from each side.',
  tags: ['processing'],
  src: { left: 'table', right: 'table' },
  props: [],
  defaultData: { leftKey: 'id', rightKey: 'id', viewName: 'join_out', kind: 'inner' },
  async update(_source) {
    const left = (this.src as Readonly<Record<string, ComponentOutput | null>>)['left'];
    const right = (this.src as Readonly<Record<string, ComponentOutput | null>>)['right'];
    if (!left || left.kind !== 'table' || !right || right.kind !== 'table') return;
    const data = readDataObject<SimpleJoinData>(this);
    const leftKey = asString(data.leftKey) ?? 'id';
    const rightKey = asString(data.rightKey) ?? 'id';
    const viewName = asString(data.viewName) ?? 'join_out';
    const kind = data.kind ?? 'inner';
    await exec(
      buildSimpleJoinSQL({
        leftTable: left.tableName,
        rightTable: right.tableName,
        toTable: viewName,
        leftKey,
        rightKey,
        kind,
      }),
    );
    const schema = await describeTable(viewName);
    this.output = { kind: 'table', tableName: viewName, schema };
  },
};
