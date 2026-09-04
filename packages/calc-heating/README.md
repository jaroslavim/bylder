# @bylder/calc-heating

Pure TypeScript Phase 1 floor-heating calculations. The package has no UI or DOM dependencies and never inserts regulatory or manufacturer values.

## Public API

- `calculateRoomHeatLoss`: sums `area_m2 * uValue_W_per_m2K * (indoorDesignTemperature_C - outdoorDesignTemperature_C)` for explicitly listed surfaces.
- `calculateFloorBuildUpResistance`: sums `thickness_m / conductivity_W_per_mK` for the required insulation and top layer, additional layers, and explicitly supplied surface resistances.
- `calculateRequiredOutputPerM2`: divides room heat loss by usable heated floor area.
- `selectPipeSpacing`: selects the widest caller-supplied spacing whose caller-supplied capacity meets the required output.
- `selectPipeDiameter`: selects the smallest caller-supplied diameter whose caller-supplied flow capacity is sufficient.
- `estimateLoopLength`: estimates `coveredArea_m2 / spacing_m * layoutFactor + connectionLength_m`.
- `assessLoopLength`: reports configured maximum-loop-length and minimum-spacing violations as typed warnings.
- `calculateSupplyReturnTemperature`: calculates mean water temperature from floor-surface temperature, output density, and resistance above the pipe, then applies the explicit water temperature drop equally around the mean.

Selection and assessment functions return `warnings` rather than silently clamping. A missing suitable spacing or diameter has an undefined selection and a typed warning. Invalid physical inputs throw `RangeError`; this distinguishes bad input from a design constraint warning.

## Assumptions and sources

- Heat loss uses the transmission relationship from ISO 12831-1:2017: `Phi = U * A * deltaT`.
- Layer resistance uses ISO 6946:2017: `R = d / lambda`.
- Output density and the water-to-surface resistance relationship follow the heat-output method of EN 1264-2:2021.
- The standards inform the relationships only. Design outdoor temperatures, surface resistances, pipe capacities, spacing capacities, maximum loop lengths, minimum spacings, layout factors, and water temperature drops must be supplied by the project or an applicable manufacturer/design standard.
