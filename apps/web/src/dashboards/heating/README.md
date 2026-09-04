# Heating dashboard

Phase 1 consumes `ProjectRepository.getProject()` and derives display metrics from the project schema. Persisted calculation results are not part of schema v0 yet, so heat-loss values, loop planning, and warnings are currently a local presentation model awaiting `@bylder/calc-heating` outputs.

## States and dependencies

- **Loading:** repository promise is pending; the dashboard shows a loading surface.
- **Ready:** a validated project has at least one floor; floor tabs, room metrics, manifold summary, warnings, and design-condition controls are available.
- **Empty:** a valid project has no floors; the user is directed to the heating canvas.
- **Error:** repository failure is shown as a recoverable alert.
- **Local mode:** `localProjectRepository` supplies the current in-memory seed project. IndexedDB can replace this adapter without changing the dashboard.

The dashboard does not call `fetch` or access SVG gesture state. Canvas navigation is a router boundary only.