# Vistrates Modernization — Status

Living checklist. Updated at the end of each phase. Branch: `claude/modernize-analytics-platform-ai0FR`.

## Phases

- [x] **Phase 0 — Scaffold** _(in progress)_
  - [x] `git mv` legacy `.csp` tree under `legacy/`
  - [x] pnpm workspace root (`package.json`, `pnpm-workspace.yaml`, `.npmrc`)
  - [x] Strict TypeScript base (`tsconfig.base.json`)
  - [x] ESLint 9 flat config with `no-explicit-any: error`
  - [x] Vitest config
  - [x] Prettier config + `.gitignore`
  - [x] In-repo plan + status docs
  - [ ] Empty package + app stubs (types/runtime/doc/data/components/server/web)
  - [ ] `pnpm install` succeeds
  - [ ] `pnpm dev` boots (Vite + Fastify both healthy)

- [ ] **Phase 1 — Types + clause hash** (1 day)
- [ ] **Phase 2 — Yjs doc model** (1–2 days)
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
