/**
 * Local ambient typing for `@uwdata/vgplot`. The package ships JS without
 * .d.ts, so we declare it as a typed-loose namespace for the demo doc.
 * Replace with proper types when upstream publishes them.
 */
declare module '@uwdata/vgplot' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyFn = (...args: any[]) => any;
  export const plot: AnyFn;
  export const barY: AnyFn;
  export const barX: AnyFn;
  export const dot: AnyFn;
  export const line: AnyFn;
  export const lineY: AnyFn;
  export const lineX: AnyFn;
  export const rectY: AnyFn;
  export const text: AnyFn;
  export const from: AnyFn;
  export const count: AnyFn;
  export const sum: AnyFn;
  export const avg: AnyFn;
  export const min: AnyFn;
  export const max: AnyFn;
  export const median: AnyFn;
  export const width: AnyFn;
  export const height: AnyFn;
  export const marginLeft: AnyFn;
  export const marginRight: AnyFn;
  export const marginTop: AnyFn;
  export const marginBottom: AnyFn;
  export const xDomain: AnyFn;
  export const yDomain: AnyFn;
  export const colorScale: AnyFn;
  export const intervalX: AnyFn;
  export const intervalY: AnyFn;
  export const intervalXY: AnyFn;
  export const toggleY: AnyFn;
  export const highlight: AnyFn;
  export const legend: AnyFn;
  export const slider: AnyFn;
  export const search: AnyFn;
}
