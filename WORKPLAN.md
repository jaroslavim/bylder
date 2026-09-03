# Bylder — Work Plan

Web-based design tool for home MEP installations (electrical, water, sewage, floor heating): 2D top/side views, drag/rotate components, per-discipline calculations, cabinet/circuit design, project file export, and installation documentation.

## Decisions locked in
- **Standard**: IEC 60364 as the baseline for electrical circuit rules; keep rule sets pluggable so a national code can replace it later.
- **MVP discipline**: Floor heating, built fully end-to-end (draw → calculate → export) before widening to electrical/water/sewage.
- **Canvas rendering**: Plain SVG with custom hit-testing (no canvas library dependency).
- **Persistence (phase 1-4)**: Local-only — browser storage (IndexedDB) + explicit export/import of a versioned JSON project file. Backend/accounts added only in the online-rollout phase.
- **Tooling**: pnpm workspaces monorepo, TypeScript everywhere.

## Repo structure (target)
```
apps/
  web/                # React + TS + Vite, SVG canvas app
  api/                # (phase 5) Fastify/NestJS backend
packages/
  project-schema/     # versioned project file format (zod schemas + TS types), shared by web/api
  geometry/           # room/wall polygon math, snapping, hit-testing helpers
  calc-heating/       # heat loss, loop spacing/diameter, flow temp, insulation/top-layer logic
  calc-electrical/     # (phase 2) circuit rules engine (IEC 60364), cabinet layout, cable sizing
  calc-water/          # (phase 3) flow rate, pipe diameter, pressure loss
  pdf-export/         # documentation/report generation
infra/
  docker/             # (phase 5) docker-compose: web, api, postgres
```
Each package gets its own `.github/instructions/*.instructions.md` (applyTo glob) so AI-assisted edits stay consistent with that package's conventions (units, formula sources, test expectations).

## Phases

### Phase 0 — Scaffold
- pnpm workspace root, TS config, ESLint/Prettier, Vitest, CI (lint+test) on push.
- `project-schema` package with v0 schema: project → floors → rooms(polygon, walls) → components(type, position, rotation, discipline-specific props).
- Empty Vite React app shell with routing for per-discipline dashboards.

### Phase 1 — Floor heating MVP
- **Drawing**: draw walls/room polygons on SVG canvas, dimensions, snapping, top-down view.
- **Components**: place manifold, heating loop terminals/zones per room.
- **Calc engine (`calc-heating`)**: per-room heat loss (U-values for wall/floor/ceiling/window, design indoor/outdoor temp, insulation layers, floor top-layer material) → required output per m² → loop spacing + pipe diameter → supply/return temp → total pipe length per loop/manifold.
- **Dashboard**: room list with heat loss, manifold circuit summary, warnings (e.g. spacing below min, loop length over max).
- **Export**: project JSON (via `project-schema`) + PDF installation report (`pdf-export`): heat-loss calc sheet, loop layout diagram, manifold schedule.
- **Exit criteria**: a real room can be modeled and produce a heat-loss/loop-layout report matching hand calculations.

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

### Phase 6 — Online test rollout
- Deploy staging environment, invite test users, collect feedback/error telemetry, iterate.

## Next steps (in order)
1. Confirm this plan.
2. Design layouts/project map in pen.dev (dashboards, floor-heating canvas screen, cabinet designer wireframe for later) — scoped first to Phase 1 screens only.
3. Scaffold the repo (Phase 0) matching the structure above.
4. Set up per-package instructions files (lightweight "agents") once package boundaries exist in code.
5. Start Phase 1 implementation.
