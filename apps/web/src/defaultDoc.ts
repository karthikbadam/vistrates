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
  title: 'Iris — linked selection',
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
  spec: ({ table, selection }) =>
    vg.plot(
      vg.barY(vg.from(table, { filterBy: selection }), {
        x: 'species',
        y: vg.count(),
        fill: 'species',
      }),
      vg.width(640),
      vg.height(360),
      vg.marginLeft(60),
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
    width: 480,
    height: 320,
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
  title: 'mtcars — Vega-Lite heatmap',
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
  spec: ({ table }) =>
    vg.plot(
      vg.barY(vg.from(table), { x: 'origin', y: vg.avg('mpg'), fill: 'origin' }),
      vg.width(560),
      vg.height(320),
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
    width: 480,
    height: 280,
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
  title: 'GPS stream — live data',
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
  spec: ({ table }) =>
    vg.plot(
      vg.barY(vg.from(table), { x: 'id', y: vg.count(), fill: 'id' }),
      vg.width(560),
      vg.height(280),
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
    width: 480,
    height: 320,
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

export const demos: readonly Demo[] = [irisDemo, carsDemo, gpsDemo];

export const DEMOS_BY_ID: Readonly<Record<string, Demo>> = Object.fromEntries(
  demos.map((d) => [d.id, d]),
);

/** Pick the active demo from `?demo=...` (default: iris). */
function pickActive(): Demo {
  if (typeof window === 'undefined') return irisDemo;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('demo');
  if (id && DEMOS_BY_ID[id]) return DEMOS_BY_ID[id];
  return irisDemo;
}

export const activeDemo: Demo = pickActive();
export const DEFAULT_DOC_ID = activeDemo.id;
export const DEFAULT_DOC_TITLE = activeDemo.title;

/** Backwards-compat for existing imports — exposes the active demo's paragraphs. */
export const demoDoc: readonly DemoParagraphConfig[] = activeDemo.paragraphs;
