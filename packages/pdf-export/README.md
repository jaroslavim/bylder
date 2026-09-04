# @bylder/pdf-export

Pure installation-report source generation built from the validated project data model. It has no React, DOM, canvas, or live UI-state dependency, so a PDF renderer can consume the returned structured data.

## API

`createInstallationReport(input)` parses `input` with `ProjectV1Schema` and returns deterministic sections for:

- export metadata and SI units;
- a heat-loss sheet with per-room and total loss;
- a loop/manifold schedule with lengths, flow, and calculated output;
- floor/room layout metadata and calculation warnings.

Rows are sorted by stable IDs. Callers can serialize the result or map it to a PDF layout engine:

```ts
const report = createInstallationReport(projectData);
```
