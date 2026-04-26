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
- [ ] **Phase 3 — Runtime + paragraph executor** (2 days)
- [ ] **Phase 4 — DuckDB-WASM + Mosaic Coordinator** (2 days)
- [ ] **Phase 5 — Visualization adapters** (2 days)
- [ ] **Phase 6 — Source / processing / text components** (2 days)
- [ ] **Phase 7 — Notebook + Dashboard + collab editor** (2 days)
- [ ] **Phase 8 — Pipeline + Mobile views** (1 day)
- [ ] **Phase 9 — Canvas + Presentation views** (2 days)
- [ ] **Phase 10 — Theme + Typewriter + Golem** (1 day)
- [ ] **Phase 11 — y-websocket collab server + persistence** (1 day)
- [ ] **Phase 12 — README + reset + error boundaries + CI green** (1 day)

## Milestones

| Date (UTC) | Phase | Note |
| --- | --- | --- |
| 2026-04-26 | 0 | Branch created, legacy moved, root configs in place. |
| 2026-04-26 | 0 | All package stubs built; `pnpm install` + `pnpm typecheck` + `pnpm dev` all green. |
| 2026-04-26 | 1 | Types package complete; clause hash + 9-test suite passing. |
| 2026-04-26 | 2 | Yjs-backed DocStore + IndexedDB/WebSocket connectors; 6 doc tests passing (15 total). |

## Open notes / decisions

- React 19 chosen for the shell because Semiotic mandates React. Mosaic vgplot is framework-agnostic and mounts inside `useEffect`.
- Clause-based interaction state replaces SearchJS entirely. SearchJS stays in `legacy/` only.
- Yjs from day one to avoid a v1→v2 doc-model rewrite.
- Live in-page paragraph eval via `new Function` (trusted authors). Sandboxing via `quickjs-emscripten` is a v2 concern.
- Hammer.js is dormant — replaced by `interactjs`. `dagre` → `@dagrejs/dagre`.

## How to keep this current

- Update the checklist at the **start** of each phase (mark `_(in progress)_`).
- Update at the **end** of each phase (tick boxes; add a Milestones row).
- Commit `docs/STATUS.md` together with the code changes for that phase.
- A session that gets cut off can be resumed by reading `docs/PLAN.md` + `docs/STATUS.md` and the latest commit.
