# Bylder — Work Plan

Web-based design tool for home MEP installations (electrical, water, sewage, floor heating): 2D top/side views, drag/rotate components, per-discipline calculations, cabinet/circuit design, project file export, and installation documentation.

## Decisions locked in
- **Standard**: IEC 60364 as the baseline for electrical circuit rules; keep rule sets pluggable so a national code can replace it later.
- **MVP discipline**: Floor heating, built fully end-to-end (draw → calculate → export) before widening to electrical/water/sewage.
- **Canvas rendering**: Plain SVG with custom hit-testing (no canvas library dependency).
- **Persistence (phase 1-4)**: Local-only — browser storage (IndexedDB) + explicit export/import of a versioned JSON project file. Backend/accounts added only in the online-rollout phase.
- **Tooling**: pnpm workspaces monorepo, TypeScript everywhere.
- **UI library**: Mantine (`@mantine/core`, `@mantine/form` with zod resolver, `@mantine/notifications`, `@mantine/modals`, `@mantine/charts`) for dashboards, forms, dialogs, tables, cabinet designer panels. The SVG canvas itself stays hand-built and library-free — no component library rendering in the drag/rotate/resize hot path.
- **State management**: Zustand for app/UI state. Canvas drag/rotate/resize updates go through refs/direct SVG attribute mutation during the gesture and only commit to the store on release, so React/Mantine re-renders never sit in the hot path (see Canvas rendering decision above).
- **Frontend service layer**: all project persistence and future backend calls go through a `ProjectRepository` interface (in `project-schema` or a new `data-access` package). Phase 1-4 ship an IndexedDB-backed implementation; Phase 5 adds an HTTP-backed implementation behind the same interface, so the local-only frontend never has to be rewritten to talk to a backend later — only the implementation swaps.

## Open-source graphics and routing components
Use focused libraries where they remove generic implementation work, while keeping installation rules and domain algorithms under our control:

- **`@flatten-js/core` (MIT)** in `packages/geometry`: points, lines, arcs, polygons, transforms, intersections, distances, boolean operations, spatial queries, serialization, and SVG helpers.
- **`@flatten-js/polygon-offset`** in `packages/geometry`: wall thickness, clearance, perimeter exclusion, and keep-out offsets.
- **`polygon-clipping` (MIT)** in `packages/geometry`: polygon union, intersection, and subtraction for room/opening/obstacle geometry.
- **`packages/routing`**: project-owned generic obstacle maps, orthogonal A* routing, route simplification, and shared route constraints. It may use a focused pathfinding dependency later, but the project API remains ours.
- **`@antv/x6` (MIT), optional Phase 2**: SVG/HTML/React graph editor for electrical cabinet and single-line diagrams, not the physical floor-plan canvas.
- **`elkjs` (EPL-2.0), optional Phase 2**: automatic graph layout in a Web Worker for cabinet/schematic diagrams; it is a layout engine, not a renderer or physical route planner.

### Deliberately custom algorithms
Do not outsource the installation logic to a generic drawing library: floor-heating serpentine/spiral generation, perimeter exclusion, spacing, loop splitting, manifold assignment, maximum lengths, cable routes with electrical rules, pipe routes with slope/pressure constraints, and cross-discipline clash detection stay in `calc-*`, `routing`, and `geometry` packages with reference-value tests.

### Rejected as the primary plan editor
Konva is MIT and strong for canvas interaction, but conflicts with the SVG/export/accessibility direction. Excalidraw's hand-drawn language is unsuitable for technical plans. tldraw is technically capable but its current SDK requires a production license key. None replaces the domain algorithms above.

## Repo structure (target)
```
apps/
  web/                # React + TS + Vite, SVG canvas app
  api/                # (phase 5) Fastify/NestJS backend
packages/
  project-schema/     # versioned project file format (zod schemas + TS types), shared by web/api
  geometry/           # room/wall polygon math, snapping, hit-testing helpers
  routing/            # generic obstacle maps, orthogonal A* routing, path simplification
  calc-heating/       # heat loss, loop spacing/diameter, flow temp, insulation/top-layer logic
  calc-electrical/     # (phase 2) circuit rules engine (IEC 60364), cabinet layout, cable sizing
  calc-water/          # (phase 3) flow rate, pipe diameter, pressure loss
  pdf-export/         # documentation/report generation
infra/
  docker/             # (phase 5) docker-compose: web, api, postgres
```
Each package gets its own `.github/instructions/*.instructions.md` (applyTo glob) so AI-assisted edits stay consistent with that package's conventions (units, formula sources, test expectations).

## Testing strategy
Testing is not a phase-5 afterthought — every phase's exit criteria requires tests, and CI blocks merges to `develop`/`main` on failure.

- **Unit tests (Vitest)**: mandatory for every package under `packages/*`, especially `calc-heating`/`calc-electrical`/`calc-water` — these are safety-critical (wrong heat-loss or circuit sizing is a real-world hazard), target ~95%+ coverage with test cases derived from known hand-calculated reference values, not just round-trip assertions.
- **Schema/migration tests**: `project-schema` versions get golden-file fixtures + migration tests so old project files always load.
- **Component tests (React Testing Library)**: dashboards, forms, panels — logic/state, not pixel layout.
- **Canvas interaction tests (Playwright, real browser)**: jsdom can't do real pointer/layout geometry, so all drag-to-move, rotate-handle, resize-handle, snapping, multi-select, and click-to-select behavior on the SVG canvas is tested by dispatching real pointer events in Chromium/Firefox/WebKit and asserting on resulting SVG attributes/state.
- **E2E tests (Playwright)**: full user flows per discipline (draw room → place components → run calc → export project + PDF) run against the built app.
- **Visual regression (Playwright screenshots)**: introduced once canvas rendering stabilizes (post Phase 1), to catch unintended rendering drift.
- **Mutation testing (Stryker, optional hardening)**: applied to calc engines once coverage is high, to verify tests actually catch broken formulas rather than just executing lines.
- **CI gates**: unit + component tests on every push; Playwright E2E/interaction suites on PRs into `develop`/`main` (slower, so not on every commit).

## AI-assisted development agents
Five instruction profiles, scoped to repo boundaries — enough to keep conventions consistent without coordination overhead. Defined as custom agents in `.github/agents/*.agent.md`.

### Model policy
Use the first model listed when available; use the fallback only when the primary model is unavailable, unsuitable for the task, or explicitly requested. Models are assigned by task shape, not as permanent ownership: the agent remains responsible for its boundary regardless of model.

| Agent | File | Short description | Model |
|---|---|---|---|
| Canvas/geometry | `canvas-geometry.agent.md` | SVG rendering, drag/rotate/resize/snapping, hit-testing + Playwright interaction tests | Claude Sonnet 4.5 (fallback GPT-5) |
| Calc-engine | `calc-engine.agent.md` | Heating/electrical/water math packages + unit tests against reference calculations | GPT-5 (fallback Claude Sonnet 4.5) — highest-reasoning model, safety-critical formulas |
| Dashboard/UI | `dashboard-ui.agent.md` | React shell, Mantine forms/dashboards + component tests | Claude Sonnet 4.5 — high-volume, pattern-following UI work |
| Schema/export | `schema-export.agent.md` | project-schema versioning/migrations, pdf-export + golden-file tests | Claude Sonnet 4.5 |
| QA/testing | `qa-testing.agent.md` | Cross-cutting test conventions, coverage thresholds, Playwright E2E suites spanning the other four | Claude Sonnet 4.5 (fallback GPT-5) |

## Backend & API future-proofing
The backend isn't built until Phase 5, but the frontend is built against these contracts from Phase 0 so nothing has to be reworked later:

- **API style**: REST, versioned (`/api/v1/...`), matching the CRUD-shaped project storage need. Request/response bodies validated with the same zod schemas from `project-schema` on both client and server (single source of truth, no schema drift).
- **Communication layer**: a single typed API client module in the web app (thin fetch wrapper: base URL, auth header/cookie attachment, error normalization, retry-on-401-refresh). All calls to the backend go through it — nothing calls `fetch` directly from components.
- **Auth**: token-based, but **not** stored in `localStorage` (XSS exposure). Access token short-lived + refresh token, both delivered as `httpOnly`, `Secure`, `SameSite=Lax` (or `Strict`) cookies set by the backend. No token handling in frontend JS at all.
- **CSRF**: since auth rides on cookies, the API requires a CSRF token (double-submit cookie or synchronizer token) on state-changing requests.
- **CORS**: backend allow-lists the deployed frontend origin(s) explicitly; no wildcard origins once cookies/credentials are involved.
- **Sessions/logout**: server-side session/refresh-token revocation list so logout and "sign out all devices" are real, not just client-side token deletion.
- **File storage**: exported project files/PDFs go to S3-compatible object storage (MinIO in `infra/docker` locally, swappable for a managed bucket in production) — not stored on the API container's filesystem.
- **Rate limiting & input validation**: rate limit auth and export endpoints; validate all inbound payloads against the shared zod schemas before touching the DB.
- **Observability**: structured logging (backend) and error tracking (e.g. Sentry, both frontend and backend) wired in from Phase 5's first deploy, not added later during Phase 6 rollout.
- **Config/secrets**: `.env`-based config, nothing secret committed; separate config per environment (local/docker/staging).
- **Out of scope for now (explicitly deferred, not forgotten)**: real-time multi-user collaboration/live cursors — Phase 5 is single-user-per-project CRUD only.

## Phases

## Design-first workflow gate
Feature development does not start until the pen.dev design work is reviewed and approved. The existing Phase 0 scaffold is infrastructure only and may be used to support the design process; it does not count as feature implementation.

1. **Pen.dev project map**: define navigation, screens, discipline boundaries, shared data shown in each view, and the future backend-facing states (loading, empty, validation, offline/local-only, unauthorized, forbidden, conflict, and error).
2. **Pen.dev layouts**: design the Phase 1 floor-heating dashboard, top-down SVG canvas, room/component property panel, calculation results/warnings, project import/export flow, and responsive desktop/tablet layouts. Include later electrical cabinet and elevation-view wireframes only where they affect shared navigation or layout decisions.
3. **Review and approval checkpoint**: inspect the layouts at desktop and narrow responsive sizes; confirm terminology, workflow, canvas controls, accessibility states, and data density. Record approval before implementation begins.
4. **Implementation starts only after approval**: scaffold/configuration may continue, then agents implement the approved Phase 1 slices with tests. Any UI behavior or screen that is not represented in the approved design returns to pen.dev before code is added.
5. **Validation loop**: compare the running implementation with the approved pen.dev layouts using Playwright screenshots and interaction tests; update the design first when requirements change, then update code.

### Phase 0 — Scaffold
- pnpm workspace root, TS config, ESLint/Prettier, Vitest, CI (lint+test) on push.
- Playwright installed and wired into CI (separate, slower job) from the start, even before there's much to click.
- `project-schema` package with v0 schema: project → floors → rooms(polygon, walls) → components(type, position, rotation, discipline-specific props), with golden-file tests from day one.
- Empty Vite React app shell with routing for per-discipline dashboards.

### Phase 1 — Floor heating MVP
- **Drawing**: draw walls/room polygons on SVG canvas, dimensions, snapping, top-down view.
- **Components**: place manifold, heating loop terminals/zones per room.
- **Calc engine (`calc-heating`)**: per-room heat loss (U-values for wall/floor/ceiling/window, design indoor/outdoor temp, insulation layers, floor top-layer material) → required output per m² → loop spacing + pipe diameter → supply/return temp → total pipe length per loop/manifold.
- **Dashboard**: room list with heat loss, manifold circuit summary, warnings (e.g. spacing below min, loop length over max).
- **Export**: project JSON (via `project-schema`) + PDF installation report (`pdf-export`): heat-loss calc sheet, loop layout diagram, manifold schedule.
- **Exit criteria**: a real room can be modeled and produce a heat-loss/loop-layout report matching hand calculations, with calc engine unit tests passing against those hand-calculated reference values and Playwright covering draw/place/drag/rotate/resize/export on the canvas.

### Phase 2 — Electrical
- Components: sockets, switches, light fixtures, junction boxes; placement + circuit grouping/wiring on plan.
- Cabinet/panel designer: circuits, breakers, RCDs, selectivity, per IEC 60364 rules (`calc-electrical`).
- Calc: load per circuit, cable sizing, voltage drop, diversity factor.
- Electrical dashboard + documentation export (circuit schedule, single-line diagram).

### Phase 3 — Water & sewage
- Taps, fixtures, pipe routing (top view), fall/slope handling for sewage.
- Calc (`calc-water`): flow rate, pipe diameter, pressure/head loss, venting.
- Dashboard + documentation export.

### Phase 4 — Cross-discipline integration
- Unified project dashboard across all four disciplines.
- Side/elevation views of walls (component heights, routing clashes).
- Basic clash detection between disciplines sharing the same wall/floor run.

### Phase 5 — Backend & Docker
- `api` package: auth, project CRUD, Postgres storage; migrate local export/import to save/sync.
- `infra/docker`: docker-compose for web+api+db, run full stack locally in containers (this is your "debug on PC" checkpoint before shipping).
- Implement the `ProjectRepository` HTTP-backed adapter (see Backend & API future-proofing) behind the interface already used by the frontend since Phase 0/1 — no frontend rewrite, only wiring.

### Phase 6 — Online test rollout
- Deploy staging environment, invite test users, collect feedback/error telemetry, iterate.

## Next steps (in order)
1. Confirm the updated plan and model policy.
2. Complete the pen.dev project map and Phase 1 layouts.
3. Review and approve the pen.dev layouts at desktop and narrow responsive sizes.
4. Only after approval, continue Phase 0 implementation/configuration and connect the approved screens.
5. Start Phase 1 implementation through the scoped agents, with tests added alongside each feature.
