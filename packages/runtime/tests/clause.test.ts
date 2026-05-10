import { describe, it, expect } from 'vitest';
import { asPredicate, type InteractionClause } from '@vistrates/types';
import { canonicalizeClause, canonicalizeJson, hashClause } from '../src/clause.js';

const baseClause: InteractionClause = {
  source: 'bar-1',
  clients: ['line-2', 'map-3'],
  predicate: asPredicate('species = $1'),
  value: { species: 'setosa' },
  schema: { kind: 'point', fields: ['species'] },
};

describe('canonicalizeJson', () => {
  it('sorts object keys lexicographically', () => {
    expect(canonicalizeJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
  it('preserves array order', () => {
    expect(canonicalizeJson([3, 1, 2])).toBe('[3,1,2]');
  });
  it('rejects non-finite numbers', () => {
    expect(() => canonicalizeJson(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => canonicalizeJson(Number.NaN)).toThrow(RangeError);
  });
});

describe('canonicalizeClause', () => {
  it('is invariant to client-list ordering', () => {
    const a = canonicalizeClause(baseClause);
    const b = canonicalizeClause({
      ...baseClause,
      clients: [...baseClause.clients].reverse(),
    });
    expect(a).toBe(b);
  });

  it('is invariant to value-key insertion order', () => {
    const a = canonicalizeClause({ ...baseClause, value: { foo: 1, bar: 2 } });
    const b = canonicalizeClause({ ...baseClause, value: { bar: 2, foo: 1 } });
    expect(a).toBe(b);
  });

  it('changes when predicate changes', () => {
    const a = canonicalizeClause(baseClause);
    const b = canonicalizeClause({ ...baseClause, predicate: asPredicate('species = $2') });
    expect(a).not.toBe(b);
  });
});

describe('hashClause', () => {
  it('returns 64-char lowercase hex', async () => {
    const h = await hashClause(baseClause);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is stable across permutations of clients and value keys', async () => {
    const h1 = await hashClause(baseClause);
    const h2 = await hashClause({
      ...baseClause,
      clients: [...baseClause.clients].reverse(),
      value: { species: 'setosa' },
    });
    expect(h1).toBe(h2);
  });

  it('differs when source changes', async () => {
    const h1 = await hashClause(baseClause);
    const h2 = await hashClause({ ...baseClause, source: 'bar-2' });
    expect(h1).not.toBe(h2);
  });
});
