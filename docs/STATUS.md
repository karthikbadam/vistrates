# Vistrates Modernization — Status

Living checklist. Updated at the end of each phase. Branch: `claude/modernize-analytics-platform-ai0FR`.

## Phases

- [x] **Phase 0 — Scaffold** _(done)_
  - [x] `git mv` legacy `.csp` tree under `legacy/`
  - [x] pnpm workspace root (`package.json`, `pnpm-workspace.yaml`, `.npmrc`)
  - [x] Strict TypeScript base (`tsconfig.base.json`)
  - [x] ESLint 9 flat config with `no-explicit-any: error`
  - [x] Vitest config
  - [x] Prettier config + `.gitignore`
  - [x] In-repo plan + status docs
  - [x] Package + app stubs (types/runtime/doc/data/components/server/web)
  - [x] `pnpm install` succeeds (367 packages, esbuild build approved)
  - [x] `pnpm dev` boots (Vite at :5173 + Fastify at :3001 — verified via HTTP smoke test)

- [x] **Phase 1 — Types + clause hash** _(done)_
  - [x] `@vistrates/types` package with `JsonValue`, `InteractionClause`, `ComponentOutput`, `VisComponentDefinition`, `VisController`, `DocSnapshot`
  - [x] Strict typing: branded `Predicate` and `ComponentId`, no `any`
  - [x] `@vistrates/runtime` clause module: `canonicalizeJson`, `canonicalizeClause`, `hashClause` (Web Crypto + Node fallback)
  - [x] Vitest: 9/9 passing (key permutation invariance, predicate sensitivity, hex format)
  - [x] `pnpm typecheck` green across all 7 packages
- [x] **Phase 2 — Yjs doc model** _(done)_
  - [x] Schema constants (`META_KEY`, `SECTIONS_KEY`, `PARAGRAPH_FIELDS`, `SCHEMA_VERSION = 1`)
  - [x] Typed `DocStore` wrapping `Y.Doc` with `init`, `addSection`, `addParagraph`, `setParagraphCode` (Y.Text), `patchParagraph{Data,Props,View}` (Y.Map), `snapshot()` (deep JSON), `encodeUpdate` / `applyUpdate`
  - [x] Yjs ↔ JSON bridge (`jsonToYMap`, `yMapToJson`, type narrowers `asYMap` / `asYArrayOfYMap` / `asYText`)
  - [x] Browser-only `attachIndexedDB` (y-indexeddb) and `connectWebsocket` (y-websocket) with dynamic imports
  - [x] Vitest: 6/6 (round-trip, paragraph patches, Y.Text replace, two-doc sync via `encodeUpdate`/`applyUpdate`, error on missing paragraph)
  - [x] `pnpm typecheck` green
- [x] **Phase 3 — Runtime + paragraph executor** _(done)_
  - [x] `TopologyBus` with typed `TopologyEvent` union (registered / unregistered / srcRebound / outputChanged)
  - [x] `VisViewImpl` with `dom` + `react` modes, `setHTML`, `render`, `moveTo`/`moveBack`, `unmount`
  - [x] `VisControllerImpl` with typed src/props/config Proxies, output setter that emits topology events, `emitClause` sugar, `swapDefinition` for hot-swap
  - [x] `Runtime` class: registry, instantiate (init+update), hotSwap (destroy+swap+init+update), destroy (cleans adjacency), bindSrc (with seed update), centralized output→observer router (no per-controller listener leak), topology snapshot
  - [x] `paragraphExec.evaluateParagraph(source, ctx)` — `new Function`, supports `vc = {...}` and `return {...}`, structured `EvalResult`
  - [x] Vitest: runtime (8) + paragraphExec (5) — 28 tests total
  - [x] `pnpm typecheck` green
- [x] **Phase 4 — DuckDB-WASM + Mosaic Coordinator** _(done)_
  - [x] Added `@duckdb/duckdb-wasm` v1.32, `@uwdata/mosaic-core` v0.16, `@uwdata/mosaic-sql` v0.16, `apache-arrow`
  - [x] `getCoordinator(opts)` lazy singleton wraps `wasmConnector()`; `query(sql)`, `exec(sql)`
  - [x] CSV loaders: `loadCsvFromUrl`, `loadCsvFromText` (via `registerFileText`), `describeTable`
  - [x] Parquet loaders: `loadParquetFromUrl`, `viewParquetFromUrl` (httpfs)
  - [x] `gpsSimulator.startGpsSimulator(opts)` — agent random walk, INSERTs into a DuckDB table on a tick
  - [x] SQL templates: `clauseToWhereSql`, `whereSql`, `buildFilterSQL`, `buildSimpleJoinSQL`, `buildGroupBySQL`, `buildDateFilterSQL`, `buildGpsFilterSQL`
  - [x] Identifier and string-literal escaping (`ident`, `strLit`)
  - [x] Vitest: 12 sql-template tests (40 total). DuckDB integration is exercised live in Phase 5+.
  - [x] `pnpm typecheck` green
- [x] **Phase 5 — Visualization adapters** _(done)_
  - [x] Added `@uwdata/vgplot` v0.16, `vega` 5, `vega-lite` 5, `vega-embed` 6, `semiotic` 3.4 (React 19 compatible)
  - [x] `makeMosaicComponent` — wraps a vgplot spec; subscribes to a per-instance `Selection`; mirrors Mosaic clauses out as Vistrates `InteractionClause`s with merged predicate
  - [x] `makeVegaLiteComponent` — pulls rows from DuckDB, inlines into spec, renders via `vega-embed`, finalizes view on destroy
  - [x] `makeSemioticComponent` — React island via `createRoot`, frame-agnostic (XYFrame / OrdinalFrame / NetworkFrame / etc.), `propsBuilder` receives rows + `emitClause` callback
  - [x] `makeDomComponent` — escape hatch for any DOM library (Leaflet, Plotly, custom D3) with mount/update/unmount lifecycle
  - [x] All adapters use `WeakMap<AnyVisController, State>` so factories are reusable across instances; per-controller state never leaks
  - [x] `pnpm typecheck` green; 40 tests still passing
- [x] **Phase 6 — Source / processing / text components** _(done)_
  - [x] Sources (4): `csvLoaderComponent`, `queryableCsvComponent`, `queryableParquetComponent`, `gpsSimulatorComponent`
  - [x] Processing (6): `filterComponent`, `simpleJoinComponent`, `filterJoinComponent`, `groupbyAverageComponent`, `dateFilterComponent`, `gpsFilterComponent`
  - [x] Text (3): `wordFrequencyAnalyzerComponent`, `tfIdfAnalyzerComponent`, `tfIdfAccessorComponent` — pure DuckDB SQL (regex tokenizer + CTE-based TF/IDF)
  - [x] `dataAccess.readDataObject<T>` typed reader for `controller.data`; `asString` / `asNumber` narrowers
  - [x] `builtinComponents` array + `registerBuiltins(rt)` helper
  - [x] Per-controller state via `WeakMap` (e.g. `gpsSimulator` keeps the simulator handle so `destroy` can stop it)
  - [x] `pnpm typecheck` green; 40 tests still passing
- [x] **Phase 7 — Notebook + Dashboard + CodeMirror editor** _(done; collab via y-codemirror.next deferred to Phase 11)_
  - [x] `RuntimeProvider` React context: lazy `Runtime` + `DocStore`, registers built-ins, instantiates demo controllers, wires src bindings, tracks boot status
  - [x] `useTopologyTick()` hook for components that re-render on topology events
  - [x] `evalCtx` providing `vg`, `makeMosaicComponent`, `makeVegaLiteComponent`, and `registry` to live-evaluated paragraph code
  - [x] `defaultDoc.ts` — Iris CSV inline + 4 demo paragraphs (CSV → Filter → Mosaic vgplot bar + Vega-Lite scatter)
  - [x] `NotebookView` with paragraph cards: header pill + Run button + status footer; CodeMirror 6 editor (one-dark theme + JS syntax)
  - [x] `DashboardView` with grid of view cards; each slot adopts the `<div class="vis-host">` the runtime owns
  - [x] Run button: `evaluateParagraph(code, evalCtx)` → register if new → `runtime.hotSwap` → status feedback
  - [x] Vite dev verified — index, main, runtimeContext, NotebookView all transform; React refresh wired
  - [x] Ambient `@uwdata/vgplot` declaration so strict TS doesn't fail on the JS-only package
  - [x] `pnpm typecheck` green; 40 tests still passing
- [x] **Phase 8 — Pipeline + Mobile views** _(done)_
  - [x] `PipelineView` consumes `runtime.topology()`, lays out via `@dagrejs/dagre` (LR rankdir), renders an SVG DAG with arrow markers and edge labels (the src slot name); re-renders on every topology event via `useTopologyTick`
  - [x] `MobileView` 375×700 phone-frame mock with prev/next nav over the demo paragraphs; reuses the same vis-host divs as Dashboard so switching tabs preserves chart state
  - [x] Tab switcher in `App.tsx` covers Dashboard / Notebook / Pipeline / Mobile
  - [x] `pnpm typecheck` green; 40 tests still passing
- [x] **Phase 9 — Canvas + Presentation views** _(done)_
  - [x] `CanvasView` — 2D canvas surface with `interactjs` drag + resize on view tiles and markdown notes; "Add note" toolbar action; double-click to edit a note (rendered via `marked`)
  - [x] Reuses runtime's `vis-host` divs so charts keep state when moved between Canvas / Dashboard / Mobile / Presentation tabs
  - [x] `PresentationView` — TraLuver-style 16:9 slide template with title + stage + footer; ←/→/space keyboard navigation
  - [x] 6-tab shell (Dashboard / Notebook / Pipeline / Canvas / Present / Mobile)
  - [x] `pnpm typecheck` green; 40 tests still passing
- [x] **Phase 10 — Theme + Typewriter + Golem** _(done)_
  - [x] `ThemeToggle` — light/dark + comfy/compact density toggles backed by `localStorage` and `data-theme` / `data-density` attributes; CSS variables flip per theme
  - [x] Typewriter — CodeMirror 6 keymap that expands snippet triggers (`vc`, `mosaic`, `vega`) when Tab is pressed at end of word; integrated into the editor
  - [x] Golem — Fastify `POST /golem` endpoint uses Playwright (optional dep) to render a vistrate URL headlessly to PNG/PDF and save under `apps/server/snapshots/`; degrades gracefully with a 503 + remediation message if Playwright isn't installed
  - [x] `GolemSnapshot` button in the header POSTs to the server and surfaces status inline
  - [x] CORS enabled on the server so the Vite app can call it across ports
  - [x] `pnpm typecheck` green; 40 tests still passing
- [~] **Phase 11 — y-websocket collab server + persistence** _(in progress — needs runtime smoke test in two browser windows; pausing per user request)_
  - [x] Server `registerCollab` registers `@fastify/websocket`, exposes `GET /collab/:doc` upgrade route
  - [x] `y-websocket/bin/utils.setupWSConnection` wires the raw socket
  - [x] Custom FS persistence (no leveldb): `setPersistence` `bindState` / `writeState` reads/writes `apps/server/data/<docId>.bin` via `Y.encodeStateAsUpdate` / `Y.applyUpdate`
  - [x] On-update flush: 1 Hz scan over `utils.docs` attaches a single `update` listener per doc
  - [x] Client gates collab behind `?collab=1`; uses `connectWebsocket` from `@vistrates/doc`
  - [x] Client also attempts `attachIndexedDB` for local-first persistence; failures are warned but never block boot
  - [x] `pnpm typecheck` green; 40 tests still passing
  - [ ] Two-tab cross-browser smoke test (resume task)
- [ ] **Phase 12 — README + reset + error boundaries + CI green** (1 day)

## Milestones

| Date (UTC) | Phase | Note |
| --- | --- | --- |
| 2026-04-26 | 0 | Branch created, legacy moved, root configs in place. |
| 2026-04-26 | 0 | All package stubs built; `pnpm install` + `pnpm typecheck` + `pnpm dev` all green. |
| 2026-04-26 | 1 | Types package complete; clause hash + 9-test suite passing. |
| 2026-04-26 | 2 | Yjs-backed DocStore + IndexedDB/WebSocket connectors; 6 doc tests passing (15 total). |
| 2026-04-26 | 3 | Runtime + VisController/View + paragraphExec hot-swap; 28 tests passing total. |
| 2026-04-26 | 4 | DuckDB-WASM + Mosaic Coordinator + SQL templates + GPS simulator; 40 tests passing total. |
| 2026-04-26 | 5 | Mosaic / Semiotic / Vega-Lite / DOM adapters; no per-chart code. |
| 2026-04-26 | 6 | 13 built-in components (4 sources / 6 processing / 3 text), all SQL-backed. |
| 2026-04-26 | 7 | React shell with Notebook (CodeMirror) + Dashboard tabs; demo doc boots end-to-end. |
| 2026-04-26 | 8 | Pipeline (Dagre DAG) + Mobile views; 4-tab shell. |
| 2026-04-26 | 9 | Canvas (interactjs drag/resize + markdown notes) + Presentation (TraLuver slide); 6-tab shell. |
| 2026-04-26 | 10 | Theme (light/dark + density), Typewriter snippet expander, Golem Playwright snapshot endpoint. |
| 2026-04-26 | 11 | y-websocket Fastify route + custom FS persistence (no leveldb); client connects via `?collab=1`. Two-tab smoke test pending. |

## Open notes / decisions

- React 19 chosen for the shell because Semiotic mandates React. Mosaic vgplot is framework-agnostic and mounts inside `useEffect`.
- Clause-based interaction state replaces SearchJS entirely. SearchJS stays in `legacy/` only.
- Yjs from day one to avoid a v1→v2 doc-model rewrite.
- Live in-page paragraph eval via `new Function` (trusted authors). Sandboxing via `quickjs-emscripten` is a v2 concern.
- Hammer.js is dormant — replaced by `interactjs`. `dagre` → `@dagrejs/dagre`.

## Resume notes (2026-04-26 — paused mid-Phase 11)

11/13 phases shipped to `claude/modernize-analytics-platform-ai0FR`. Latest pushed commit covers Phase 11 server + client wiring; what's left:

1. Smoke-test collab end-to-end in two browser windows opened with `?collab=1`. Verify: edits sync via `/collab/:doc`, doc persists to `apps/server/data/<docId>.bin`, restart restores state.
2. **Phase 12 — Polish.** Top-level `README.md` quickstart, error boundaries around lifecycle methods (mirror original try/catch from `legacy/Vistrates/kTKppb2i-Vistrate.csp` lines 455–461), one-click "Reset doc" button, ensure `pnpm test && pnpm lint && pnpm typecheck` are all green for CI.
3. Optional: `y-codemirror.next` integration so the CodeMirror editor itself becomes collaborative (not just the doc model).
4. Optional: structured Vitest coverage for the React shell (e.g. `@testing-library/react` smoke test that boots `RuntimeProvider` and asserts the demo controllers come up).

Resume by reading `docs/PLAN.md` + this file + the latest commit.

## How to keep this current

- Update the checklist at the **start** of each phase (mark `_(in progress)_`).
- Update at the **end** of each phase (tick boxes; add a Milestones row).
- Commit `docs/STATUS.md` together with the code changes for that phase.
- A session that gets cut off can be resumed by reading `docs/PLAN.md` + `docs/STATUS.md` and the latest commit.
