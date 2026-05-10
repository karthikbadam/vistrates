import type { AnyVisComponentDefinition } from '@vistrates/types';
import { describeTable, exec } from '@vistrates/data';
import { asNumber, asString, readDataObject } from '../dataAccess.js';

interface SyntheticExoplanetsData {
  readonly tableName: string;
  readonly rows?: number;
  readonly seed?: number;
}

/**
 * Generate a synthetic exoplanets catalog directly inside DuckDB.
 *
 * Schema (6 columns):
 *   name              VARCHAR  — synthetic Kepler-/HD-style name
 *   host_type         VARCHAR  — M dwarf | K dwarf | G dwarf | F dwarf | A type
 *   mass_earth        DOUBLE   — log-uniform 0.1 .. 5000  (Earth masses)
 *   radius_earth      DOUBLE   — derived from mass with scatter
 *   orbital_period_d  DOUBLE   — log-uniform 0.5 .. 10000 days
 *   discovery_year    INTEGER  — 1992 .. 2025 (skewed to recent years)
 *
 * Defaults to 1000 rows. `seed` makes the dataset reproducible.
 */
export const syntheticExoplanetsComponent: AnyVisComponentDefinition = {
  id: 'synthetic-exoplanets',
  name: 'Synthetic Exoplanets',
  version: '0.1.0',
  description:
    'Generate a 1000-row synthetic exoplanets catalog (6 cols) directly in DuckDB.',
  tags: ['source', 'astronomy', 'synthetic'],
  src: {},
  props: [],
  defaultData: { tableName: 'planets', rows: 1000, seed: 42 },
  async init() {
    const data = readDataObject<SyntheticExoplanetsData>(this);
    const tableName = asString(data.tableName) ?? 'planets';
    const rows = Math.max(1, Math.min(100_000, asNumber(data.rows) ?? 1000));
    const seedRaw = asNumber(data.seed);
    const seedFrac =
      seedRaw === undefined ? 0.42 : Math.max(-1, Math.min(1, seedRaw / 100 - 0.5));
    const safeTo = tableName.replace(/"/g, '""');

    // setseed makes random() deterministic for the rest of the session;
    // we re-seed on every init so reloads produce the same catalog.
    await exec(`SELECT setseed(${seedFrac})`);
    const sql = `CREATE OR REPLACE TABLE "${safeTo}" AS
      WITH src AS (
        SELECT
          i,
          random() AS r1, random() AS r2, random() AS r3,
          random() AS r4, random() AS r5, random() AS r6
        FROM range(1, ${rows + 1}) t(i)
      ),
      typed AS (
        SELECT
          i,
          CASE
            WHEN r1 < 0.45 THEN 'M dwarf'
            WHEN r1 < 0.70 THEN 'K dwarf'
            WHEN r1 < 0.88 THEN 'G dwarf'
            WHEN r1 < 0.97 THEN 'F dwarf'
            ELSE                'A type'
          END AS host_type,
          /* mass: log-uniform 0.1 .. 5000  (Earth masses) */
          exp(ln(0.1) + r2 * (ln(5000.0) - ln(0.1))) AS mass_earth,
          /* derived radius: ~ mass^0.55 with multiplicative scatter */
          GREATEST(0.4,
            pow(exp(ln(0.1) + r2 * (ln(5000.0) - ln(0.1))), 0.55) * (0.6 + r3 * 0.9)
          ) AS radius_earth,
          /* orbital period: log-uniform 0.5 .. 10000 days */
          exp(ln(0.5) + r4 * (ln(10000.0) - ln(0.5))) AS orbital_period_d,
          /* year: skewed toward recent years (sqrt of uniform → favors high) */
          (1992 + CAST(floor(33 * sqrt(r5)) AS INTEGER)) AS discovery_year,
          /* name disambiguation suffix */
          r6
        FROM src
      )
      SELECT
        CASE
          WHEN i % 4 = 0 THEN 'Kepler-' || ((i / 4) + 1)
          WHEN i % 4 = 1 THEN 'TOI-'    || (1000 + i)
          WHEN i % 4 = 2 THEN 'HD '     || (10000 + i * 7 % 90000)
          ELSE                'WASP-'   || ((i / 4) + 1)
        END
        || CASE CAST(floor(r6 * 6) AS INTEGER)
             WHEN 0 THEN ' b' WHEN 1 THEN ' c' WHEN 2 THEN ' d'
             WHEN 3 THEN ' e' WHEN 4 THEN ' f' ELSE ' g' END AS name,
        host_type,
        mass_earth,
        radius_earth,
        orbital_period_d,
        discovery_year
      FROM typed`;
    await exec(sql);
    const schema = await describeTable(tableName);
    this.output = { kind: 'table', tableName, schema };
  },
};
