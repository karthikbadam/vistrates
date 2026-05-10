import { describe, it, expect } from 'vitest';
import { asPredicate, type InteractionClause } from '@vistrates/types';
import { ident, strLit } from '../src/csv.js';
import {
  buildDateFilterSQL,
  buildFilterSQL,
  buildGpsFilterSQL,
  buildGroupBySQL,
  buildSimpleJoinSQL,
  clauseToWhereSql,
  whereSql,
} from '../src/sqlTemplates.js';

const sampleClause: InteractionClause = {
  source: 'bar',
  clients: ['line'],
  predicate: asPredicate("species = 'setosa'"),
  value: { species: 'setosa' },
  schema: { kind: 'point', fields: ['species'] },
};

describe('sql identifier helpers', () => {
  it('quotes identifiers and escapes embedded double quotes', () => {
    expect(ident('iris')).toBe('"iris"');
    expect(ident('weird"name')).toBe('"weird""name"');
  });

  it('escapes single quotes in literals', () => {
    expect(strLit("o'reilly")).toBe("'o''reilly'");
  });
});

describe('whereSql / clauseToWhereSql', () => {
  it('returns empty string for no fragments', () => {
    expect(whereSql([])).toBe('');
    expect(whereSql([undefined, undefined])).toBe('');
  });

  it('AND-joins multiple fragments', () => {
    expect(whereSql(['a > 0', 'b < 10', undefined])).toBe(' WHERE a > 0 AND b < 10');
  });

  it('returns the predicate string for a clause', () => {
    expect(clauseToWhereSql(sampleClause)).toBe("species = 'setosa'");
  });
});

describe('buildFilterSQL', () => {
  it('emits a CREATE VIEW with no WHERE when no clause given', () => {
    expect(buildFilterSQL({ fromTable: 'iris', toTable: 'iris_f' })).toBe(
      'CREATE OR REPLACE VIEW "iris_f" AS SELECT * FROM "iris"',
    );
  });

  it('appends a WHERE from the clause predicate', () => {
    expect(buildFilterSQL({ fromTable: 'iris', toTable: 'iris_f', clause: sampleClause })).toBe(
      `CREATE OR REPLACE VIEW "iris_f" AS SELECT * FROM "iris" WHERE species = 'setosa'`,
    );
  });
});

describe('buildSimpleJoinSQL', () => {
  it('builds an inner join by default', () => {
    expect(
      buildSimpleJoinSQL({
        leftTable: 'a',
        rightTable: 'b',
        toTable: 'ab',
        leftKey: 'k',
        rightKey: 'k',
      }),
    ).toBe(
      'CREATE OR REPLACE VIEW "ab" AS SELECT l.*, r.* FROM "a" l INNER JOIN "b" r ON l."k" = r."k"',
    );
  });
});

describe('buildGroupBySQL', () => {
  it('builds aggregates with default aliasing', () => {
    expect(
      buildGroupBySQL({
        fromTable: 'iris',
        toTable: 'iris_g',
        groupBy: ['species'],
        aggregates: [{ column: 'sepal_length', fn: 'avg' }],
      }),
    ).toBe(
      'CREATE OR REPLACE VIEW "iris_g" AS SELECT "species", avg("sepal_length") AS "avg_sepal_length" FROM "iris" GROUP BY "species"',
    );
  });

  it('rejects empty groupBy + empty aggregates', () => {
    expect(() =>
      buildGroupBySQL({ fromTable: 'a', toTable: 'b', groupBy: [], aggregates: [] }),
    ).toThrow();
  });
});

describe('buildDateFilterSQL', () => {
  it('emits a half-open interval condition', () => {
    expect(
      buildDateFilterSQL({
        fromTable: 'events',
        toTable: 'recent',
        column: 'ts',
        start: '2025-01-01',
        end: '2025-02-01',
      }),
    ).toBe(
      `CREATE OR REPLACE VIEW "recent" AS SELECT * FROM "events" WHERE "ts" >= '2025-01-01'::TIMESTAMP AND "ts" < '2025-02-01'::TIMESTAMP`,
    );
  });
});

describe('buildGpsFilterSQL', () => {
  it('builds a bounding-box filter', () => {
    expect(
      buildGpsFilterSQL({
        fromTable: 'pings',
        toTable: 'in_box',
        latColumn: 'lat',
        lonColumn: 'lon',
        minLat: 47,
        maxLat: 48,
        minLon: -123,
        maxLon: -122,
      }),
    ).toBe(
      'CREATE OR REPLACE VIEW "in_box" AS SELECT * FROM "pings" WHERE "lat" BETWEEN 47 AND 48 AND "lon" BETWEEN -123 AND -122',
    );
  });
});
