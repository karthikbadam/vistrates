# Vistrates

A modern TypeScript + Node rebuild of [Vistrates](https://hcil.umd.edu/vistrates/) — a literate, reactive component platform for visual analytics, originally introduced by Badam et al. at IEEE VIS 2018.

The original was built on Webstrates / Codestrates, both unmaintained as of 2026. This rebuild keeps the ideas — reactive component dataflow, multi-level views (Notebook / Dashboard / Pipeline / Canvas / Presentation / Mobile), live in-page paragraph evaluation, real-time collaboration — and drops the substrate. The original `.csp` packages are kept under `legacy/` for reference only.

## Quickstart

```bash
git clone https://github.com/karthikbadam/vistrates.git
cd vistrates
pnpm install
pnpm dev
```

Open <http://127.0.0.1:5173>. The Vite SPA + Fastify server boot together. The default demo (`?demo=iris`) loads the Iris CSV into DuckDB-WASM and renders three linked views.

Try `?demo=cars`, `?demo=gps`, or `?collab=1` (the Demo picker in the header switches demos for you).

## Demos

Live (after Pages deploy): https://karthikbadam.github.io/vistrates/

| Demo | URL | What it shows |
| --- | --- | --- |
| **iris** | [`?demo=iris`](https://karthikbadam.github.io/vistrates/?demo=iris) | Iris dataset → filter → Mosaic vgplot bar chart + Vega-Lite scatter. Brushing the bar chart filters the scatter via a shared `InteractionClause`. |
| **cars** | [`?demo=cars`](https://karthikbadam.github.io/vistrates/?demo=cars) | `mtcars` → Mosaic vgplot avg-MPG bar + Vega-Lite cyl×origin heatmap. |
| **gps** | [`?demo=gps`](https://karthikbadam.github.io/vistrates/?demo=gps) | `gps-simulator` streams synthetic GPS rows into DuckDB on a 250 ms tick → vgplot per-agent counts + Vega-Lite scatter of lat/lon. Live data; everything updates reactively. |

Locally:

```bash
pnpm dev
# then open
open "http://127.0.0.1:5173/?demo=iris"
open "http://127.0.0.1:5173/?demo=cars"
open "http://127.0.0.1:5173/?demo=gps"
```

The Dashboard tab also has clickable demo cards at the top so you can switch between them in-app.

## Architecture

| Package | Purpose |
| --- | --- |
| `packages/types` | Shared types — branded `Predicate` and `ComponentId`, `JsonValue`, `InteractionClause` (the **hashable interaction state**), `ComponentOutput`, fully generic `VisComponentDefinition` + `VisController`, `DocSnapshot` |
| `packages/runtime` | `Runtime`, `VisController`, `VisView`, paragraph executor (live `new Function` eval w/ hot-swap), clause canonicalizer + SHA-256 hash, topology event stream |
| `packages/doc` | Yjs-backed `DocStore` + IndexedDB local persistence + WebSocket collab connector |
| `packages/data` | DuckDB-WASM facade + Mosaic Coordinator + CSV / Parquet loaders + GPS simulator + SQL templates (filter, join, group-by, date-filter, gps-filter) |
| `packages/components` | Adapter components (Mosaic vgplot / Semiotic / Vega-Lite / DOM) + 13 built-in source/processing/text components, all SQL-backed |
| `packages/server` | Fastify Node server: y-websocket sync (`/collab/:doc` with on-disk Y.Doc persistence), Playwright "Golem" snapshot endpoint (`POST /golem`), CORS |
| `apps/web` | Vite + React 19 SPA: 6-tab shell (Dashboard / Notebook / Pipeline / Canvas / Present / Mobile), CodeMirror 6 editor with Typewriter snippets, light/dark theme, demo picker, GH Pages-ready build |

## The hashable interaction state

The original Vistrates passed SearchJS query blobs between components. We replaced that with a typed `InteractionClause` whose canonical JSON form (sorted keys, sorted clients) hashes via SHA-256 to a stable hex digest. The same brush twice → same hash. Maps 1:1 onto Mosaic's clause shape (`source / clients / predicate / value / schema`).

```ts
interface InteractionClause {
  readonly source: string;
  readonly clients: readonly string[];
  readonly predicate: Predicate;       // canonical SQL fragment
  readonly value: JsonValue;
  readonly schema: ClauseSchema;
}
```

This is the lingua franca for cross-component selection and the cache key for memoized queries.

## No per-chart implementations

Visualizations come "for free" via four adapters in `packages/components/src/adapters/`:

- **`makeMosaicComponent`** — wraps a vgplot spec; subscribes to a per-instance `Selection`; mirrors Mosaic clauses out as Vistrates `InteractionClause`s.
- **`makeSemioticComponent`** — mounts a Semiotic React frame (XYFrame, OrdinalFrame, NetworkFrame, etc.) inside a `createRoot` island; `propsBuilder` receives rows + an `emitClause` callback.
- **`makeVegaLiteComponent`** — pulls rows from DuckDB, inlines into spec, renders via `vega-embed`.
- **`makeDomComponent`** — escape hatch for any DOM library (Leaflet, Plotly, custom D3) with `mount`/`update`/`unmount` lifecycle.

All adapters use a `WeakMap<AnyVisController, State>` so factory-returned definitions can be safely instantiated multiple times.

## Live coding

Each notebook paragraph is a CodeMirror 6 editor (one-dark + JS lang + Typewriter snippet expander). The Run button calls `evaluateParagraph(code, ctx)` against a curated context (`vg`, `makeMosaicComponent`, `makeVegaLiteComponent`, `registry`) and hot-swaps the resulting `VisComponentDefinition` into the live controller — `destroy → swap → init → update(undefined)`. Type `vc⇥`, `mosaic⇥`, or `vega⇥` to expand a skeleton.

## Save / load `.vistrate` files

The header has Save and Load buttons. **Save** downloads the live `Y.Doc` as a `<demo>-<timestamp>.vistrate` binary (the same `Y.encodeStateAsUpdate` format the y-websocket server persists). **Load** picks a `.vistrate` file, merges it into the current doc via `Y.applyUpdate`, and reloads the page so the runtime re-instantiates against the restored state. Round-trips cleanly with collab — the file format is identical on both sides.

`RuntimeProvider` is idempotent on `addSection` and reads paragraph `data` / `code` from the doc snapshot when present, so loaded files restore your edits without resetting the demo wiring.

## Real-time collaboration

Open the same URL with `?collab=1` in two browser windows: doc state syncs through the Fastify y-websocket route (`/collab/:doc`) and persists to disk under `packages/server/data/<docId>.bin`. Both browsers see each other's edits within ~100 ms.

```bash
# Tab 1
open http://localhost:5173/?collab=1
# Tab 2
open http://localhost:5173/?collab=1
```

## GitHub Pages

The `.github/workflows/pages.yml` workflow builds the Vite app with `VITE_BASE=/<repo-name>/` and deploys `apps/web/dist` via `actions/deploy-pages`. Enable Pages in the repo settings → Pages → Source = "GitHub Actions". The next push triggers a deploy.

The deployed static build runs the full demo (DuckDB-WASM + Mosaic + Semiotic + Vega-Lite + React Flow pipeline view) entirely in the browser. Collab is gated on `?collab=1` — it requires the Fastify server, which Pages doesn't host.

## Tooling

- **Strict TypeScript** — `strict`, `noImplicitAny`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `useUnknownInCatchVariables`. ESLint flat config bans `any` and the `no-unsafe-*` family.
- **pnpm workspace**, Node ≥ 22 LTS.
- **Vitest** with `jsdom` for unit tests (40 passing as of v0.1).
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` are all green.

## Project status

See [`docs/PLAN.md`](./docs/PLAN.md) for the full modernization plan and [`docs/STATUS.md`](./docs/STATUS.md) for the per-phase progress checklist.

## License

MIT — original Vistrates copyright 2018 Sriram Karthik Badam, Andreas Mathisen, Roman Rädle, Clemens Klokmose, and Niklas Elmqvist; rebuild 2026.
