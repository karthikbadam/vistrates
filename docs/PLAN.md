# Vistrates Modernization — Plan

> Mirror of the approved plan from `/root/.claude/plans/can-you-dig-deep-async-goblet.md`, kept in-repo for the team.

## Context

**Vistrates** (Badam et al., IEEE VIS 2018) is a literate computing platform for developing, assembling, sharing, and reusing visualization components in data analytics — a reactive component-based dataflow system for visual analytics with multiple abstraction levels (code, dashboard, canvas, presentation). Original repo: dormant since Feb 2019. Original platform (Webstrates/Codestrates) appears unmaintained.

**Goal:** rebuild as a modern TypeScript + Node prototype that boots with `pnpm install && pnpm dev` and demonstrates the core Vistrates spirit — without any Codestrates/Webstrates dependency.

**v1 outcome:** DuckDB-WASM is the data substrate. Mosaic supplies the typed Selection/Clause model that doubles as the **hashable interaction state**. Visualizations come "for free" via two adapters — UW Mosaic vgplot and nteract Semiotic — so we don't reimplement individual charts. Live in-page paragraph evaluation, real-time collab via Yjs + y-websocket, the full set of views (Notebook / Dashboard / Pipeline / Canvas / Presentation / Mobile), and the Theme/Typewriter/Golem helpers all ship in v1. Strict TypeScript, no `any`.

## Architecture (one paragraph)

Vite + React 19 + TypeScript (strict). Mosaic Coordinator is the data + selection backbone (DuckDB-WASM under it). Yjs is the doc model from day one (`y-indexeddb` local-first, `y-websocket` collab via the project's own Fastify server, `y-codemirror.next` for collaborative code editing). Components are typed `VisComponentDefinition`s with `init / update / destroy` lifecycle methods; their `output` is one of `{ table, clause, value }`. Visualization is delivered by adapter components (Mosaic vgplot, Semiotic, Vega-Lite, plain DOM) so we never hand-roll a chart.

## Hashable interaction state

Replaces the original SearchJS query blob. A typed `InteractionClause` (source / clients / predicate / value / schema) canonicalizes to sorted-keys JSON and hashes via SHA-256. Maps 1:1 onto `@uwdata/mosaic-core` clauses — same brush twice produces the same hash, which we use as a memoization key.

## Package layout

| Package | Purpose |
| --- | --- |
| `packages/types` | Shared types (clause, doc, component, mosaic, semiotic) |
| `packages/runtime` | Registry, `VisController`, paragraph executor (live `new Function` eval w/ hot-swap), clause hash, topology event stream |
| `packages/doc` | Yjs-backed doc store + bindings + local persistence + collab connector |
| `packages/data` | DuckDB-WASM facade + Mosaic Coordinator + CSV/Parquet loaders + GPS simulator + SQL templates |
| `packages/components` | Adapter components (mosaic / semiotic / vegaLite / domHost) + sources + processing + text + interface + presentation + helpers |
| `packages/server` | Fastify Node server: y-websocket sync, Playwright `golem` snapshot, `/assets/parquet/*` proxy |
| `apps/web` | Vite + React 19 SPA (Notebook / Dashboard / Pipeline / Canvas / Presentation / Mobile views, CodeMirror 6 editor) |

## Tooling

- pnpm workspace, Node ≥ 22 LTS, TypeScript 5.7 with `strict`, `noImplicitAny`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `useUnknownInCatchVariables`.
- Vite 5 + `@vitejs/plugin-react`. ESLint 9 flat config + `typescript-eslint` with `no-explicit-any: error` and `no-unsafe-*: error`.
- Vitest with jsdom; Playwright for component flow tests.

## Runtime deps (latest, as of 2026-04)

React 19, `@uwdata/mosaic-core` + `mosaic-sql` + `vgplot`, `@duckdb/duckdb-wasm`, `semiotic` (nteract), `vega-lite` 5, Yjs stack (`yjs`, `y-indexeddb`, `y-websocket`, `y-protocols`, `y-codemirror.next`), CodeMirror 6, `interactjs` (replaces Hammer.js), `@dagrejs/dagre`, Fastify 5 + `@fastify/websocket` + Playwright. Excluded as deprecated/dormant: Hammer.js, Bower, Polymer, raw `dagre`, Leaflet.draw 0.4.x, embedded SearchJS, FontAwesome 4.

## Implementation phases

| # | Phase | Days |
| --- | --- | --- |
| 0 | Scaffold (pnpm workspace, Vite, Fastify stub, `legacy/`) | 1 |
| 1 | Types + clause hash | 1 |
| 2 | Yjs doc model | 1–2 |
| 3 | Runtime + paragraph executor | 2 |
| 4 | DuckDB-WASM data layer + Mosaic Coordinator | 2 |
| 5 | Visualization adapters | 2 |
| 6 | Source / processing / text components | 2 |
| 7 | Notebook + Dashboard + collab editor | 2 |
| 8 | Pipeline + Mobile views | 1 |
| 9 | Canvas + Presentation views | 2 |
| 10 | Theme + Typewriter + Golem | 1 |
| 11 | y-websocket collab server + on-disk persistence | 1 |
| 12 | Polish (README, error boundaries, CI green) | 1 |

Total: **17–22 working days**.

## Verification (when v1 is "done")

End-to-end demo flow expected to pass:

1. `pnpm install && pnpm dev` boots web (`:5173`) + server (`:3001`) with no console errors.
2. `pnpm typecheck && pnpm lint` — zero errors. ESLint denies `any` and `@ts-ignore` in `packages/**`.
3. Demo doc: `queryableParquet → filter → mosaicVgplot bar` + sibling `semiotic XYFrame` + `vegaLite` heatmap.
4. Linked selection across all three views; clauses produce stable `hashClause(...)` hex.
5. Live coding: edit a paragraph spec, click Run, hot-swaps without page reload.
6. CSV drag-drop and remote Parquet load both work; GPSSimulator streams ~10 rows/sec.
7. Canvas + Presentation + Mobile views all functional.
8. Real-time collab: two browser windows on the same `?doc=` URL sync code edits and selections.
9. Persistence via IndexedDB locally and on-disk on the server.
10. Golem: Playwright headless snapshot returns a PNG.
11. `pnpm test` green, including a Playwright component test for the linked-selection flow.

## Reference

Original components live in `legacy/` for porting-by-eye reference. They are read-only — we do not import or run them.
