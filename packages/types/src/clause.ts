import type { JsonValue } from './json.js';

/** Canonical SQL fragment — what the predicate looks like to DuckDB. */
export type Predicate = string & { readonly __brand: 'Predicate' };

export const asPredicate = (sql: string): Predicate => sql as Predicate;

export type ClauseSchema =
  | { readonly kind: 'point'; readonly fields: readonly string[] }
  | { readonly kind: 'interval'; readonly fields: readonly string[] }
  | { readonly kind: 'range'; readonly field: string }
  | {
      readonly kind: 'match';
      readonly field: string;
      readonly method: 'contains' | 'prefix' | 'regex';
    };

/**
 * A typed Vistrates interaction clause.
 *
 * Inspired by UW Mosaic's clause shape (source / clients / predicate / value / schema).
 * Canonicalizes deterministically so the same selection always hashes to the same hex.
 */
export interface InteractionClause {
  readonly source: string;
  readonly clients: readonly string[];
  readonly predicate: Predicate;
  readonly value: JsonValue;
  readonly schema: ClauseSchema;
}
