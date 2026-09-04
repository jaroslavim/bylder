# @bylder/project-schema

Versioned project file format (Zod schemas plus TypeScript types), shared by the application and exporters.

## Versions and migration

`ProjectV0Schema` remains the original geometry/component format. `ProjectV1Schema` adds floor-heating rooms, construction layers, design conditions, manifolds, loops, calculation results, warnings, and export metadata. `ProjectV2Schema` is the complete project-file envelope: it preserves that geometry and data and adds validated, future-compatible dashboard data for heating, electrical, water, sewage, calculations, reports, and settings, plus imported source metadata. `ProjectSchema` accepts every supported version; `parseProject` migrates to v2.

Schema versions are immutable. A shape change creates a new version and a `migrateProject` step from the immediately previous version. `migrateProject` validates its input, preserves geometry and room identity, and supplies explicit deterministic defaults for fields that older versions did not contain. `serializeProject` emits canonical JSON with sorted object keys and stable array order. `parseProject` rejects malformed JSON or invalid project data. New migrations must add a golden fixture and tests for parsing and preservation.

```ts
const project = parseProject(fileText);
const fileText = serializeProject(project);
```
