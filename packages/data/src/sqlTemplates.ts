import type { InteractionClause } from '@vistrates/types';
import { ident, strLit } from './csv.js';

/**
 * Map an `InteractionClause` to a SQL fragment usable in a WHERE clause.
 * Our predicates are already canonical SQL — this is identity for now,
 * but stays a function so we can later support clause kinds that need
 * template binding (e.g. parameterized queries).
 */
export function clauseToWhereSql(clause: InteractionClause | undefined): string | undefined {
  if (!clause) return undefined;
  return clause.predicate;
}

/** WHERE-clause builder that AND-joins a list of optional fragments. */
export function whereSql(fragments: ReadonlyArray<string | undefined>): string {
  const parts = fragments.filter((f): f is string => typeof f === 'string' && f.length > 0);
  return parts.length === 0 ? '' : ` WHERE ${parts.join(' AND ')}`;
}

export interface FilterParams {
  readonly fromTable: string;
  readonly toTable: string;
  readonly clause?: InteractionClause | undefined;
}

export function buildFilterSQL({ fromTable, toTable, clause }: FilterParams): string {
  const where = whereSql([clauseToWhereSql(clause)]);
  return `CREATE OR REPLACE VIEW ${ident(toTable)} AS SELECT * FROM ${ident(fromTable)}${where}`;
}

export interface SimpleJoinParams {
  readonly leftTable: string;
  readonly rightTable: string;
  readonly toTable: string;
  readonly leftKey: string;
  readonly rightKey: string;
  readonly kind?: 'inner' | 'left' | 'right' | 'full';
}

export function buildSimpleJoinSQL({
  leftTable,
  rightTable,
  toTable,
  leftKey,
  rightKey,
  kind = 'inner',
}: SimpleJoinParams): string {
  const join = kind.toUpperCase();
  return `CREATE OR REPLACE VIEW ${ident(toTable)} AS SELECT l.*, r.* FROM ${ident(leftTable)} l ${join} JOIN ${ident(rightTable)} r ON l.${ident(leftKey)} = r.${ident(rightKey)}`;
}

export interface GroupByParams {
  readonly fromTable: string;
  readonly toTable: string;
  readonly groupBy: readonly string[];
  readonly aggregates: ReadonlyArray<{ readonly column: string; readonly fn: 'avg' | 'sum' | 'count' | 'min' | 'max'; readonly as?: string }>;
}

export function buildGroupBySQL({ fromTable, toTable, groupBy, aggregates }: GroupByParams): string {
  if (groupBy.length === 0 && aggregates.length === 0) {
    throw new Error('buildGroupBySQL: groupBy and aggregates cannot both be empty');
  }
  const aggSql = aggregates.map(
    (a) => `${a.fn}(${ident(a.column)}) AS ${ident(a.as ?? `${a.fn}_${a.column}`)}`,
  );
  const groupCols = groupBy.map(ident);
  const select = [...groupCols, ...aggSql].join(', ');
  const groupClause = groupBy.length > 0 ? ` GROUP BY ${groupCols.join(', ')}` : '';
  return `CREATE OR REPLACE VIEW ${ident(toTable)} AS SELECT ${select} FROM ${ident(fromTable)}${groupClause}`;
}

export interface DateFilterParams {
  readonly fromTable: string;
  readonly toTable: string;
  readonly column: string;
  readonly start?: string;
  readonly end?: string;
}

export function buildDateFilterSQL({
  fromTable,
  toTable,
  column,
  start,
  end,
}: DateFilterParams): string {
  const conditions: string[] = [];
  if (start !== undefined) {
    conditions.push(`${ident(column)} >= ${strLit(start)}::TIMESTAMP`);
  }
  if (end !== undefined) {
    conditions.push(`${ident(column)} < ${strLit(end)}::TIMESTAMP`);
  }
  const where = whereSql(conditions);
  return `CREATE OR REPLACE VIEW ${ident(toTable)} AS SELECT * FROM ${ident(fromTable)}${where}`;
}

export interface GpsFilterParams {
  readonly fromTable: string;
  readonly toTable: string;
  readonly latColumn: string;
  readonly lonColumn: string;
  readonly minLat: number;
  readonly maxLat: number;
  readonly minLon: number;
  readonly maxLon: number;
}

export function buildGpsFilterSQL({
  fromTable,
  toTable,
  latColumn,
  lonColumn,
  minLat,
  maxLat,
  minLon,
  maxLon,
}: GpsFilterParams): string {
  const lat = ident(latColumn);
  const lon = ident(lonColumn);
  const where = whereSql([
    `${lat} BETWEEN ${minLat} AND ${maxLat}`,
    `${lon} BETWEEN ${minLon} AND ${maxLon}`,
  ]);
  return `CREATE OR REPLACE VIEW ${ident(toTable)} AS SELECT * FROM ${ident(fromTable)}${where}`;
}
