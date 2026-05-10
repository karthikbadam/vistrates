/**
 * Inline demo CSV (subset of Iris). Kept tiny so first-run is fast and
 * doesn't depend on a network fetch.
 */
export const IRIS_CSV = `species,sepal_length,sepal_width,petal_length,petal_width
setosa,5.1,3.5,1.4,0.2
setosa,4.9,3.0,1.4,0.2
setosa,4.7,3.2,1.3,0.2
setosa,4.6,3.1,1.5,0.2
setosa,5.0,3.6,1.4,0.2
setosa,5.4,3.9,1.7,0.4
versicolor,7.0,3.2,4.7,1.4
versicolor,6.4,3.2,4.5,1.5
versicolor,6.9,3.1,4.9,1.5
versicolor,5.5,2.3,4.0,1.3
versicolor,6.5,2.8,4.6,1.5
versicolor,5.7,2.8,4.5,1.3
virginica,6.3,3.3,6.0,2.5
virginica,5.8,2.7,5.1,1.9
virginica,7.1,3.0,5.9,2.1
virginica,6.3,2.9,5.6,1.8
virginica,6.5,3.0,5.8,2.2
virginica,7.6,3.0,6.6,2.1
`;

export const CARS_CSV = `name,mpg,cyl,hp,wt,year,origin
Mazda RX4,21.0,6,110,2.620,1973,Asia
Mazda RX4 Wag,21.0,6,110,2.875,1973,Asia
Datsun 710,22.8,4,93,2.320,1973,Asia
Hornet 4 Drive,21.4,6,110,3.215,1973,US
Hornet Sportabout,18.7,8,175,3.440,1973,US
Valiant,18.1,6,105,3.460,1973,US
Duster 360,14.3,8,245,3.570,1973,US
Merc 240D,24.4,4,62,3.190,1973,Europe
Merc 230,22.8,4,95,3.150,1973,Europe
Merc 280,19.2,6,123,3.440,1973,Europe
Merc 280C,17.8,6,123,3.440,1973,Europe
Merc 450SE,16.4,8,180,4.070,1973,Europe
Merc 450SL,17.3,8,180,3.730,1973,Europe
Merc 450SLC,15.2,8,180,3.780,1973,Europe
Cadillac Fleetwood,10.4,8,205,5.250,1973,US
Lincoln Continental,10.4,8,215,5.424,1973,US
Chrysler Imperial,14.7,8,230,5.345,1973,US
Fiat 128,32.4,4,66,2.200,1973,Europe
Honda Civic,30.4,4,52,1.615,1973,Asia
Toyota Corolla,33.9,4,65,1.835,1973,Asia
Toyota Corona,21.5,4,97,2.465,1973,Asia
Dodge Challenger,15.5,8,150,3.520,1973,US
AMC Javelin,15.2,8,150,3.435,1973,US
Camaro Z28,13.3,8,245,3.840,1973,US
Pontiac Firebird,19.2,8,175,3.845,1973,US
Fiat X1-9,27.3,4,66,1.935,1973,Europe
Porsche 914-2,26.0,4,91,2.140,1973,Europe
Lotus Europa,30.4,4,113,1.513,1973,Europe
Ford Pantera L,15.8,8,264,3.170,1973,US
Ferrari Dino,19.7,6,175,2.770,1973,Europe
Maserati Bora,15.0,8,335,3.570,1973,Europe
Volvo 142E,21.4,4,109,2.780,1973,Europe
`;

export interface DemoParagraphConfig {
  readonly paragraphId: string;
  readonly name: string;
  readonly defId: string;
  readonly data: Record<string, unknown>;
  readonly src?: Readonly<Record<string, string>>;
  readonly code?: string;
  /**
   * Whether this paragraph renders something to the Dashboard. Default true.
   * Source/processing paragraphs (`csv-loader`, `filter`, etc.) emit data
   * but have no view, so we mark them `false` to keep the dashboard clean.
   */
  readonly visible?: boolean;
}

export interface Demo {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly paragraphs: readonly DemoParagraphConfig[];
}

// ---------------------------------------------------------------- iris demo

const irisDemo: Demo = {
  id: 'iris',
  title: 'Iris',
  description:
    'Classic Iris dataset. Drag-brush the bar chart to filter; the scatter plot updates live via the shared selection.',
  paragraphs: [
    {
      paragraphId: 'p-csv',
      name: 'Iris CSV',
      defId: 'csv-loader',
      data: { tableName: 'iris', text: IRIS_CSV },
      visible: false,
      code: `// Built-in csv-loader. Edit \`data\` in the inspector to point at your own CSV.\nreturn registry['csv-loader'];`,
    },
    {
      paragraphId: 'p-filter',
      name: 'Filter (linked selection)',
      defId: 'filter',
      data: { viewName: 'iris_filtered' },
      src: { in: 'p-csv' },
      visible: false,
      code: `return registry['filter'];`,
    },
    {
      paragraphId: 'p-bar',
      name: 'Bar Chart (Mosaic vgplot)',
      defId: 'demo-mosaic-bar',
      data: {},
      src: { table: 'p-filter' },
      code: `return makeMosaicComponent({
  id: 'demo-mosaic-bar',
  name: 'Bar Chart (Mosaic vgplot)',
  version: '0.1.0',
  spec: ({ table, selection, width, height }) =>
    vg.plot(
      vg.barY(vg.from(table, { filterBy: selection }), {
        x: 'species',
        y: vg.count(),
        fill: 'species',
      }),
      vg.width(width),
      vg.height(Math.min(height, 360)),
      vg.marginLeft(48),
    ),
});`,
    },
    {
      paragraphId: 'p-vega',
      name: 'Sepal length vs width (Vega-Lite)',
      defId: 'demo-vegalite-scatter',
      data: {},
      src: { table: 'p-csv' },
      code: `return makeVegaLiteComponent({
  id: 'demo-vegalite-scatter',
  name: 'Sepal length vs width',
  version: '0.1.0',
  spec: () => ({
    height: 280,
    mark: { type: 'point', filled: true, size: 80 },
    encoding: {
      x: { field: 'sepal_length', type: 'quantitative' },
      y: { field: 'sepal_width', type: 'quantitative' },
      color: { field: 'species', type: 'nominal' },
    },
  }),
});`,
    },
  ],
};

// --------------------------------------------------------------- cars demo

const carsDemo: Demo = {
  id: 'cars',
  title: 'mtcars',
  description:
    'Cars dataset binned by cylinders × origin with average MPG. Demonstrates the Vega-Lite adapter against an inline CSV.',
  paragraphs: [
    {
      paragraphId: 'cars-csv',
      name: 'mtcars CSV',
      defId: 'csv-loader',
      data: { tableName: 'cars', text: CARS_CSV },
      visible: false,
      code: `return registry['csv-loader'];`,
    },
    {
      paragraphId: 'cars-bar',
      name: 'Avg MPG by origin (Mosaic vgplot)',
      defId: 'demo-cars-bar',
      data: {},
      src: { table: 'cars-csv' },
      code: `return makeMosaicComponent({
  id: 'demo-cars-bar',
  name: 'Avg MPG by origin',
  version: '0.1.0',
  spec: ({ table, width, height }) =>
    vg.plot(
      vg.barY(vg.from(table), { x: 'origin', y: vg.avg('mpg'), fill: 'origin' }),
      vg.width(width),
      vg.height(Math.min(height, 320)),
    ),
});`,
    },
    {
      paragraphId: 'cars-heatmap',
      name: 'cyl × origin heatmap (Vega-Lite)',
      defId: 'demo-cars-heatmap',
      data: {},
      src: { table: 'cars-csv' },
      code: `return makeVegaLiteComponent({
  id: 'demo-cars-heatmap',
  name: 'Heatmap',
  version: '0.1.0',
  spec: () => ({
    height: 240,
    mark: 'rect',
    encoding: {
      x: { field: 'cyl', type: 'ordinal' },
      y: { field: 'origin', type: 'nominal' },
      color: { aggregate: 'mean', field: 'mpg', type: 'quantitative', scale: { scheme: 'viridis' } },
    },
  }),
});`,
    },
  ],
};

// ---------------------------------------------------------------- gps demo

const gpsDemo: Demo = {
  id: 'gps',
  title: 'GPS stream',
  description:
    'Synthetic GPS rows stream into DuckDB on a 200 ms tick; the bar chart updates reactively as new agents arrive.',
  paragraphs: [
    {
      paragraphId: 'gps-source',
      name: 'GPS Simulator',
      defId: 'gps-simulator',
      data: { tableName: 'gps_stream', intervalMs: 250, agents: 5 },
      visible: false,
      code: `return registry['gps-simulator'];`,
    },
    {
      paragraphId: 'gps-counts',
      name: 'Pings per agent (vgplot)',
      defId: 'demo-gps-counts',
      data: {},
      src: { table: 'gps-source' },
      code: `return makeMosaicComponent({
  id: 'demo-gps-counts',
  name: 'Pings per agent',
  version: '0.1.0',
  spec: ({ table, width, height }) =>
    vg.plot(
      vg.barY(vg.from(table), { x: 'id', y: vg.count(), fill: 'id' }),
      vg.width(width),
      vg.height(Math.min(height, 280)),
    ),
});`,
    },
    {
      paragraphId: 'gps-track',
      name: 'GPS track (Vega-Lite scatter)',
      defId: 'demo-gps-track',
      data: {},
      src: { table: 'gps-source' },
      code: `return makeVegaLiteComponent({
  id: 'demo-gps-track',
  name: 'GPS track',
  version: '0.1.0',
  spec: () => ({
    height: 280,
    mark: { type: 'point', filled: true, size: 30 },
    encoding: {
      x: { field: 'lon', type: 'quantitative', scale: { zero: false } },
      y: { field: 'lat', type: 'quantitative', scale: { zero: false } },
      color: { field: 'id', type: 'nominal' },
    },
  }),
});`,
    },
  ],
};

// ----------------------------------------------------- exoplanets demo

/**
 * Astronomy demo — 1000-row × 6-column synthetic exoplanet catalog.
 *
 * The pipeline is:
 *
 *   synthetic-exoplanets  →  planets table
 *                              ↘ (table)
 *   crossfilter-selection  →  shared Selection
 *                              ↘ (selection)
 *   five charts, each consuming both                  → linked brushes
 *
 * Brushing any chart cross-filters the others through the shared
 * Selection — the canonical Vistrates linked-selection pattern,
 * resolved via the dataflow graph rather than a magic global.
 */
const exoplanetsDemo: Demo = {
  id: 'exoplanets',
  title: 'Exoplanets',
  description:
    '1000 synthetic exoplanets, 6 columns. Five Mosaic vgplot charts wired to a single crossfilter-selection node — brush any one and the rest filter live.',
  paragraphs: [
    {
      paragraphId: 'planets-source',
      name: 'Synthetic exoplanets (1000 × 6)',
      defId: 'synthetic-exoplanets',
      data: { tableName: 'planets', rows: 1000, seed: 42 },
      visible: false,
      code: `// 1000 rows × 6 cols generated directly in DuckDB:
//   name, host_type, mass_earth, radius_earth,
//   orbital_period_d, discovery_year
// Edit data.rows to scale; data.seed makes it reproducible.
return registry['synthetic-exoplanets'];`,
    },
    {
      paragraphId: 'planets-selection',
      name: 'Linked selection',
      defId: 'crossfilter-selection',
      data: {},
      visible: false,
      code: `// A single Selection.crossfilter() shared across every chart on this
// page. Each chart wires this paragraph as src.selection — the runtime
// resolves the same Selection instance into all consumers, so brushing
// one chart cross-filters the rest.
return registry['crossfilter-selection'];`,
    },
    {
      paragraphId: 'planets-host',
      name: 'Host star type',
      defId: 'demo-planets-host',
      data: {},
      src: { table: 'planets-source', selection: 'planets-selection' },
      code: `// Bar of host-star type. Click bars to toggle. The Selection comes
// in through src.selection, wired up in the dataflow graph above —
// same instance reaches every other chart on the page.
return makeMosaicComponent({
  id: 'demo-planets-host',
  name: 'Host star type',
  version: '0.1.0',
  spec: ({ table, selection, width, height }) =>
    vg.plot(
      vg.barY(vg.from(table, { filterBy: selection }), {
        x: 'host_type',
        y: vg.count(),
        fill: 'host_type',
      }),
      vg.toggleX({ as: selection }),
      vg.width(width),
      vg.height(Math.min(height, 240)),
    ),
});`,
    },
    {
      paragraphId: 'planets-mass-radius',
      name: 'Mass vs radius (log–log)',
      defId: 'demo-planets-mr',
      data: {},
      src: { table: 'planets-source', selection: 'planets-selection' },
      code: `// Scatter on log axes. Drag a rectangular brush to crossfilter.
return makeMosaicComponent({
  id: 'demo-planets-mr',
  name: 'Mass vs radius',
  version: '0.1.0',
  spec: ({ table, selection, width, height }) =>
    vg.plot(
      vg.dot(vg.from(table, { filterBy: selection }), {
        x: 'mass_earth',
        y: 'radius_earth',
        fill: 'host_type',
        r: 2,
        fillOpacity: 0.6,
      }),
      vg.intervalXY({ as: selection }),
      vg.xScale('log'),
      vg.yScale('log'),
      vg.xLabel('mass (M⊕, log)'),
      vg.yLabel('radius (R⊕, log)'),
      vg.width(width),
      vg.height(Math.min(height, 320)),
    ),
});`,
    },
    {
      paragraphId: 'planets-period',
      name: 'Orbital period (log)',
      defId: 'demo-planets-period',
      data: {},
      src: { table: 'planets-source', selection: 'planets-selection' },
      code: `return makeMosaicComponent({
  id: 'demo-planets-period',
  name: 'Orbital period',
  version: '0.1.0',
  spec: ({ table, selection, width, height }) =>
    vg.plot(
      vg.rectY(vg.from(table, { filterBy: selection }), {
        x: vg.bin('orbital_period_d', { maxbins: 30 }),
        y: vg.count(),
        fill: '#dfd0b8',
      }),
      vg.intervalX({ as: selection }),
      vg.xScale('log'),
      vg.xLabel('period (days, log)'),
      vg.width(width),
      vg.height(Math.min(height, 220)),
    ),
});`,
    },
    {
      paragraphId: 'planets-discovery',
      name: 'Discoveries by year',
      defId: 'demo-planets-year',
      data: {},
      src: { table: 'planets-source', selection: 'planets-selection' },
      code: `return makeMosaicComponent({
  id: 'demo-planets-year',
  name: 'Discoveries by year',
  version: '0.1.0',
  spec: ({ table, selection, width, height }) =>
    vg.plot(
      vg.rectY(vg.from(table, { filterBy: selection }), {
        x: vg.bin('discovery_year', { maxbins: 34 }),
        y: vg.count(),
        fill: '#82c1ff',
      }),
      vg.intervalX({ as: selection }),
      vg.xLabel('discovery year'),
      vg.width(width),
      vg.height(Math.min(height, 220)),
    ),
});`,
    },
    {
      paragraphId: 'planets-radius-hist',
      name: 'Radius distribution (log)',
      defId: 'demo-planets-radius',
      data: {},
      src: { table: 'planets-source', selection: 'planets-selection' },
      code: `return makeMosaicComponent({
  id: 'demo-planets-radius',
  name: 'Radius distribution',
  version: '0.1.0',
  spec: ({ table, selection, width, height }) =>
    vg.plot(
      vg.rectY(vg.from(table, { filterBy: selection }), {
        x: vg.bin('radius_earth', { maxbins: 26 }),
        y: vg.count(),
        fill: '#9ae6b4',
      }),
      vg.intervalX({ as: selection }),
      vg.xScale('log'),
      vg.xLabel('radius (R⊕, log)'),
      vg.width(width),
      vg.height(Math.min(height, 220)),
    ),
});`,
    },
  ],
};

export const demos: readonly Demo[] = [exoplanetsDemo, irisDemo, carsDemo, gpsDemo];

export const DEMOS_BY_ID: Readonly<Record<string, Demo>> = Object.fromEntries(
  demos.map((d) => [d.id, d]),
);

/** Pick the active demo from `?demo=...` (default: exoplanets). */
function pickActive(): Demo {
  if (typeof window === 'undefined') return exoplanetsDemo;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('demo');
  if (id && DEMOS_BY_ID[id]) return DEMOS_BY_ID[id];
  return exoplanetsDemo;
}

export const activeDemo: Demo = pickActive();
export const DEFAULT_DOC_ID = activeDemo.id;
export const DEFAULT_DOC_TITLE = activeDemo.title;

/** Backwards-compat for existing imports — exposes the active demo's paragraphs. */
export const demoDoc: readonly DemoParagraphConfig[] = activeDemo.paragraphs;
