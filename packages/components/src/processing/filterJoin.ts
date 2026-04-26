import type { AnyVisComponentDefinition, ComponentOutput, InteractionClause } from '@vistrates/types';
import { asPredicate } from '@vistrates/types';
import { asString, readDataObject } from '../dataAccess.js';

interface FilterJoinData {
  readonly mode?: 'AND' | 'OR';
}

/**
 * Combine two upstream selection clauses with AND or OR (default AND).
 * The output is a single `clause` that downstream filters consume.
 */
export const filterJoinComponent: AnyVisComponentDefinition = {
  id: 'filter-join',
  name: 'Filter Join',
  version: '0.1.0',
  description: 'AND / OR-combine two upstream selection clauses.',
  tags: ['processing'],
  src: { left: 'clause', right: 'clause' },
  props: [],
  defaultData: { mode: 'AND' },
  update(_source) {
    const left = (this.src as Readonly<Record<string, ComponentOutput | null>>)['left'];
    const right = (this.src as Readonly<Record<string, ComponentOutput | null>>)['right'];
    const data = readDataObject<FilterJoinData>(this);
    const mode = asString(data.mode) === 'OR' ? 'OR' : 'AND';

    const leftClause = left?.kind === 'clause' ? left.clause : undefined;
    const rightClause = right?.kind === 'clause' ? right.clause : undefined;

    if (!leftClause && !rightClause) {
      this.output = undefined;
      return;
    }
    if (leftClause && !rightClause) {
      this.output = { kind: 'clause', clause: leftClause };
      return;
    }
    if (!leftClause && rightClause) {
      this.output = { kind: 'clause', clause: rightClause };
      return;
    }
    if (!leftClause || !rightClause) return;
    const merged: InteractionClause = {
      source: this.id,
      clients: [],
      predicate: asPredicate(`(${leftClause.predicate}) ${mode} (${rightClause.predicate})`),
      value: { left: leftClause.value, right: rightClause.value, mode },
      schema: { kind: 'interval', fields: [] },
    };
    this.output = { kind: 'clause', clause: merged };
  },
};
