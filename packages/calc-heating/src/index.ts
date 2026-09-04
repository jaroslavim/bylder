export interface HeatLossSurface {
	name: string;
	area_m2: number;
	uValue_W_per_m2K: number;
}

export interface RoomHeatLossInput {
	surfaces: HeatLossSurface[];
	indoorDesignTemperature_C: number;
	outdoorDesignTemperature_C: number;
}

export interface RoomHeatLossResult {
	heatLoss_W: number;
	designTemperatureDifference_K: number;
	surfaceLosses_W: Record<string, number>;
}

export interface ThermalLayer {
	name: string;
	thickness_m: number;
	conductivity_W_per_mK: number;
}

export interface FloorBuildUpInput {
	insulation: ThermalLayer;
	topLayer: ThermalLayer;
	additionalLayers: ThermalLayer[];
	internalSurfaceResistance_m2K_per_W: number;
	externalSurfaceResistance_m2K_per_W: number;
}

export interface ThermalResistanceResult {
	totalResistance_m2K_per_W: number;
	layerResistances_m2K_per_W: Record<string, number>;
}

export interface RequiredOutputInput {
	heatLoss_W: number;
	usableFloorArea_m2: number;
}

export interface RequiredOutputResult {
	requiredOutput_W_per_m2: number;
}

export interface PipeSpacingOption {
	spacing_mm: number;
	maximumOutput_W_per_m2: number;
}

export type HeatingWarningCode =
	| 'NO_SUITABLE_SPACING'
	| 'SPACING_BELOW_MINIMUM'
	| 'LOOP_EXCEEDS_MAX_LENGTH'
	| 'NO_SUITABLE_PIPE_DIAMETER';

export interface HeatingWarning {
	code: HeatingWarningCode;
	message: string;
	actual?: number;
	limit?: number;
	unit?: string;
}

export interface PipeSpacingSelectionResult {
	selectedSpacing_mm: number | undefined;
	warnings: HeatingWarning[];
}

export interface PipeDiameterOption {
	diameter_mm: number;
	maximumFlow_L_per_min: number;
}

export interface PipeDiameterSelectionResult {
	selectedDiameter_mm: number | undefined;
	warnings: HeatingWarning[];
}

export interface LoopLengthInput {
	coveredArea_m2: number;
	spacing_mm: number;
	connectionLength_m: number;
	layoutFactor: number;
}

export interface LoopLengthResult {
	estimatedLoopLength_m: number;
}

export interface LoopAssessmentInput {
	estimatedLoopLength_m: number;
	maximumLoopLength_m: number;
	spacing_mm: number;
	minimumSpacing_mm: number;
}

export interface LoopAssessmentResult {
	warnings: HeatingWarning[];
}

export interface SupplyReturnTemperatureInput {
	floorSurfaceTemperature_C: number;
	requiredOutput_W_per_m2: number;
	thermalResistanceAbovePipe_m2K_per_W: number;
	designWaterTemperatureDrop_K: number;
}

export interface SupplyReturnTemperatureResult {
	meanWaterTemperature_C: number;
	supplyTemperature_C: number;
	returnTemperature_C: number;
}

function assertPositive(value: number, name: string): void {
	if (!Number.isFinite(value) || value <= 0) {
		throw new RangeError(`${name} must be a finite value greater than zero`);
	}
}

function assertNonNegative(value: number, name: string): void {
	if (!Number.isFinite(value) || value < 0) {
		throw new RangeError(`${name} must be a finite non-negative value`);
	}
}

/** ISO 12831-1:2017, equation for transmission heat transfer: Phi = U * A * (theta_i - theta_e). */
export function calculateRoomHeatLoss(input: RoomHeatLossInput): RoomHeatLossResult {
	assertPositive(input.indoorDesignTemperature_C - input.outdoorDesignTemperature_C, 'design temperature difference');
	if (input.surfaces.length === 0) {
		throw new RangeError('surfaces must contain at least one explicit surface');
	}

	const designTemperatureDifference_K = input.indoorDesignTemperature_C - input.outdoorDesignTemperature_C;
	const surfaceLosses_W = Object.fromEntries(
		input.surfaces.map((surface) => {
			assertPositive(surface.area_m2, `${surface.name} area_m2`);
			assertPositive(surface.uValue_W_per_m2K, `${surface.name} uValue_W_per_m2K`);
			return [surface.name, surface.area_m2 * surface.uValue_W_per_m2K * designTemperatureDifference_K];
		}),
	);

	return {
		heatLoss_W: Object.values(surfaceLosses_W).reduce((total, loss) => total + loss, 0),
		designTemperatureDifference_K,
		surfaceLosses_W,
	};
}

/** ISO 6946:2017, R = d / lambda; surface resistances are supplied explicitly because they depend on the construction and boundary conditions. */
export function calculateFloorBuildUpResistance(input: FloorBuildUpInput): ThermalResistanceResult {
	assertNonNegative(input.internalSurfaceResistance_m2K_per_W, 'internalSurfaceResistance_m2K_per_W');
	assertNonNegative(input.externalSurfaceResistance_m2K_per_W, 'externalSurfaceResistance_m2K_per_W');
	const layers = [input.insulation, input.topLayer, ...input.additionalLayers];
	const layerResistances_m2K_per_W = Object.fromEntries(
		layers.map((layer) => {
			assertPositive(layer.thickness_m, `${layer.name} thickness_m`);
			assertPositive(layer.conductivity_W_per_mK, `${layer.name} conductivity_W_per_mK`);
			return [layer.name, layer.thickness_m / layer.conductivity_W_per_mK];
		}),
	);

	return {
		totalResistance_m2K_per_W:
			input.internalSurfaceResistance_m2K_per_W +
			input.externalSurfaceResistance_m2K_per_W +
			Object.values(layerResistances_m2K_per_W).reduce((total, resistance) => total + resistance, 0),
		layerResistances_m2K_per_W,
	};
}

/** EN 1264-2:2021 heat output density is the room design heat demand divided by active floor area. */
export function calculateRequiredOutputPerM2(input: RequiredOutputInput): RequiredOutputResult {
	assertNonNegative(input.heatLoss_W, 'heatLoss_W');
	assertPositive(input.usableFloorArea_m2, 'usableFloorArea_m2');
	return { requiredOutput_W_per_m2: input.heatLoss_W / input.usableFloorArea_m2 };
}

/** Selection compares the required density with caller-supplied tested/design capacities; no capacity or spacing is inferred. */
export function selectPipeSpacing(
	requiredOutput_W_per_m2: number,
	allowedSpacings: PipeSpacingOption[],
	minimumSpacing_mm: number,
): PipeSpacingSelectionResult {
	assertNonNegative(requiredOutput_W_per_m2, 'requiredOutput_W_per_m2');
	assertPositive(minimumSpacing_mm, 'minimumSpacing_mm');
	if (allowedSpacings.length === 0) throw new RangeError('allowedSpacings must contain at least one option');
	const selected = [...allowedSpacings]
		.sort((first, second) => second.spacing_mm - first.spacing_mm)
		.find((option) => {
			assertPositive(option.spacing_mm, 'spacing_mm');
			assertNonNegative(option.maximumOutput_W_per_m2, 'maximumOutput_W_per_m2');
			return option.maximumOutput_W_per_m2 >= requiredOutput_W_per_m2;
		});
	const warnings: HeatingWarning[] = [];
	if (!selected) {
		warnings.push({
			code: 'NO_SUITABLE_SPACING',
			message: 'No allowed spacing has sufficient caller-supplied output capacity.',
			actual: requiredOutput_W_per_m2,
			unit: 'W/m2',
		});
		return { selectedSpacing_mm: undefined, warnings };
	}
	if (selected.spacing_mm < minimumSpacing_mm) {
		warnings.push({
			code: 'SPACING_BELOW_MINIMUM',
			message: 'Selected spacing is below the configured minimum spacing.',
			actual: selected.spacing_mm,
			limit: minimumSpacing_mm,
			unit: 'mm',
		});
	}
	return { selectedSpacing_mm: selected.spacing_mm, warnings };
}

/** Diameter selection is a lookup against an explicit flow-capacity table; regulatory or manufacturer limits are not embedded. */
export function selectPipeDiameter(
	requiredFlow_L_per_min: number,
	allowedDiameters: PipeDiameterOption[],
): PipeDiameterSelectionResult {
	assertNonNegative(requiredFlow_L_per_min, 'requiredFlow_L_per_min');
	if (allowedDiameters.length === 0) throw new RangeError('allowedDiameters must contain at least one option');
	const selected = [...allowedDiameters]
		.sort((first, second) => first.diameter_mm - second.diameter_mm)
		.find((option) => {
			assertPositive(option.diameter_mm, 'diameter_mm');
			assertNonNegative(option.maximumFlow_L_per_min, 'maximumFlow_L_per_min');
			return option.maximumFlow_L_per_min >= requiredFlow_L_per_min;
		});
	return selected
		? { selectedDiameter_mm: selected.diameter_mm, warnings: [] }
		: {
				selectedDiameter_mm: undefined,
				warnings: [{
					code: 'NO_SUITABLE_PIPE_DIAMETER',
					message: 'No allowed pipe diameter has sufficient caller-supplied flow capacity.',
					actual: requiredFlow_L_per_min,
					unit: 'L/min',
				}],
			};
}

/** Standard geometric estimate: pipe length = covered area / spacing, multiplied by an explicit layout factor, plus connections. */
export function estimateLoopLength(input: LoopLengthInput): LoopLengthResult {
	assertPositive(input.coveredArea_m2, 'coveredArea_m2');
	assertPositive(input.spacing_mm, 'spacing_mm');
	assertNonNegative(input.connectionLength_m, 'connectionLength_m');
	assertPositive(input.layoutFactor, 'layoutFactor');
	return {
		estimatedLoopLength_m:
			(input.coveredArea_m2 / (input.spacing_mm / 1000)) * input.layoutFactor + input.connectionLength_m,
	};
}

export function assessLoopLength(input: LoopAssessmentInput): LoopAssessmentResult {
	assertNonNegative(input.estimatedLoopLength_m, 'estimatedLoopLength_m');
	assertPositive(input.maximumLoopLength_m, 'maximumLoopLength_m');
	assertPositive(input.spacing_mm, 'spacing_mm');
	assertPositive(input.minimumSpacing_mm, 'minimumSpacing_mm');
	const warnings: HeatingWarning[] = [];
	if (input.estimatedLoopLength_m > input.maximumLoopLength_m) {
		warnings.push({
			code: 'LOOP_EXCEEDS_MAX_LENGTH',
			message: 'Estimated loop length exceeds the configured maximum loop length.',
			actual: input.estimatedLoopLength_m,
			limit: input.maximumLoopLength_m,
			unit: 'm',
		});
	}
	if (input.spacing_mm < input.minimumSpacing_mm) {
		warnings.push({
			code: 'SPACING_BELOW_MINIMUM',
			message: 'Spacing is below the configured minimum spacing.',
			actual: input.spacing_mm,
			limit: input.minimumSpacing_mm,
			unit: 'mm',
		});
	}
	return { warnings };
}

/** EN 1264-2:2021 models output as q = (theta_water_mean - theta_surface) / R above pipe. */
export function calculateSupplyReturnTemperature(
	input: SupplyReturnTemperatureInput,
): SupplyReturnTemperatureResult {
	assertNonNegative(input.requiredOutput_W_per_m2, 'requiredOutput_W_per_m2');
	assertNonNegative(input.thermalResistanceAbovePipe_m2K_per_W, 'thermalResistanceAbovePipe_m2K_per_W');
	assertNonNegative(input.designWaterTemperatureDrop_K, 'designWaterTemperatureDrop_K');
	const meanWaterTemperature_C =
		input.floorSurfaceTemperature_C +
		input.requiredOutput_W_per_m2 * input.thermalResistanceAbovePipe_m2K_per_W;
	return {
		meanWaterTemperature_C,
		supplyTemperature_C: meanWaterTemperature_C + input.designWaterTemperatureDrop_K / 2,
		returnTemperature_C: meanWaterTemperature_C - input.designWaterTemperatureDrop_K / 2,
	};
}
