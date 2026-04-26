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

export interface DemoParagraphConfig {
  readonly paragraphId: string;
  readonly name: string;
  readonly defId: string;
  readonly data: Record<string, unknown>;
  /** Initial src bindings: srcSlotName → upstream paragraphId. */
  readonly src?: Readonly<Record<string, string>>;
  readonly code?: string;
}

/**
 * The demo document: CSV → Filter → Mosaic vgplot bar chart, all wired.
 *
 * Each paragraph is identified by a stable id we use both as the Yjs
 * paragraph id and the runtime ComponentId.
 */
export const demoDoc: readonly DemoParagraphConfig[] = [
  {
    paragraphId: 'p-csv',
    name: 'Iris CSV',
    defId: 'csv-loader',
    data: { tableName: 'iris', text: IRIS_CSV },
    code: `// Built-in csv-loader. Edit \`data\` in the inspector to point at your own CSV.\nreturn registry['csv-loader'];`,
  },
  {
    paragraphId: 'p-filter',
    name: 'Filter (linked selection)',
    defId: 'filter',
    data: { viewName: 'iris_filtered' },
    src: { in: 'p-csv' },
    code: `// Built-in filter. Bind 'selection' from a chart to enable cross-filtering.\nreturn registry['filter'];`,
  },
  {
    paragraphId: 'p-bar',
    name: 'Bar Chart (Mosaic vgplot)',
    defId: 'demo-mosaic-bar',
    data: {},
    src: { table: 'p-filter' },
    code: `// Defines a Mosaic vgplot bar chart. Edit and click Run to hot-swap.
return makeMosaicComponent({
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
];

export const DEFAULT_DOC_ID = 'demo';
export const DEFAULT_DOC_TITLE = 'Vistrates demo — Iris';
