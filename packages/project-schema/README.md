# @bylder/project-schema

Versioned project file format (Zod schemas plus TypeScript types), shared by the application and exporters.

## Versions and migration

`ProjectV0Schema` remains the original geometry/component format. `ProjectV1Schema` adds floor-heating rooms, construction layers, design conditions, manifolds, loops, calculation results, warnings, and export metadata. `ProjectSchema` is the compatibility parser and accepts either version; latest-only consumers should use `ProjectV1Schema`.

Schema versions are immutable. A shape change creates a new version and a `migrateProject` step from the immediately previous version. `migrateProject` validates its input, preserves v0 floors and rooms, and supplies explicit deterministic defaults for fields that v0 did not contain. New migrations must add a golden fixture and tests for both parsing and preservation.

```ts
const project = migrateProject(JSON.parse(fileText));
const latest = ProjectV1Schema.parse(project);
```
