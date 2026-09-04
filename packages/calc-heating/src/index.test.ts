import { describe, expect, it } from 'vitest';

import {
  assessLoopLength,
  calculateFloorBuildUpResistance,
  calculateRequiredOutputPerM2,
  calculateRoomHeatLoss,
  calculateSupplyReturnTemperature,
  estimateLoopLength,
  selectPipeDiameter,
  selectPipeSpacing,
} from './index';

describe('floor heating calculations', () => {
  it('calculates room transmission heat loss using explicit areas and U-values', () => {
    const result = calculateRoomHeatLoss({
      indoorDesignTemperature_C: 20,
      outdoorDesignTemperature_C: -5,
      surfaces: [
        { name: 'wall', area_m2: 10, uValue_W_per_m2K: 0.2 },
        { name: 'window', area_m2: 2, uValue_W_per_m2K: 1.2 },
      ],
    });
    expect(result).toEqual({
      heatLoss_W: 110,
      designTemperatureDifference_K: 25,
      surfaceLosses_W: { wall: 50, window: 60 },
    });
  });

  it('calculates layer and surface thermal resistance', () => {
    const result = calculateFloorBuildUpResistance({
      insulation: { name: 'insulation', thickness_m: 0.1, conductivity_W_per_mK: 0.04 },
      topLayer: { name: 'screed', thickness_m: 0.05, conductivity_W_per_mK: 1.4 },
      additionalLayers: [],
      internalSurfaceResistance_m2K_per_W: 0.1,
      externalSurfaceResistance_m2K_per_W: 0.04,
    });
    expect(result.layerResistances_m2K_per_W).toEqual({ insulation: 2.5, screed: 0.05 / 1.4 });
    expect(result.totalResistance_m2K_per_W).toBeCloseTo(2.675714286, 8);
  });

  it('calculates required output per usable floor area', () => {
    expect(calculateRequiredOutputPerM2({ heatLoss_W: 110, usableFloorArea_m2: 8 })).toEqual({
      requiredOutput_W_per_m2: 13.75,
    });
  });

  it('selects the widest allowed spacing that meets explicit capacity', () => {
    expect(selectPipeSpacing(75, [
      { spacing_mm: 300, maximumOutput_W_per_m2: 60 },
      { spacing_mm: 200, maximumOutput_W_per_m2: 90 },
      { spacing_mm: 150, maximumOutput_W_per_m2: 110 },
    ], 100)).toEqual({ selectedSpacing_mm: 200, warnings: [] });
  });

  it('returns a warning instead of clamping when no spacing is suitable', () => {
    const result = selectPipeSpacing(120, [{ spacing_mm: 200, maximumOutput_W_per_m2: 90 }], 100);
    expect(result.selectedSpacing_mm).toBeUndefined();
    expect(result.warnings[0].code).toBe('NO_SUITABLE_SPACING');
  });

  it('selects the smallest diameter with explicit flow capacity', () => {
    expect(selectPipeDiameter(4, [
      { diameter_mm: 16, maximumFlow_L_per_min: 3 },
      { diameter_mm: 20, maximumFlow_L_per_min: 6 },
    ])).toEqual({ selectedDiameter_mm: 20, warnings: [] });
  });

  it('returns a typed warning when no pipe diameter is suitable', () => {
    const result = selectPipeDiameter(7, [{ diameter_mm: 20, maximumFlow_L_per_min: 6 }]);
    expect(result.selectedDiameter_mm).toBeUndefined();
    expect(result.warnings[0].code).toBe('NO_SUITABLE_PIPE_DIAMETER');
  });

  it('estimates loop length from spacing and explicit layout inputs', () => {
    expect(estimateLoopLength({
      coveredArea_m2: 20,
      spacing_mm: 200,
      connectionLength_m: 5,
      layoutFactor: 1.1,
    })).toEqual({ estimatedLoopLength_m: 115.00000000000001 });
  });

  it('warns for maximum loop length and minimum spacing violations', () => {
    expect(assessLoopLength({
      estimatedLoopLength_m: 105,
      maximumLoopLength_m: 100,
      spacing_mm: 80,
      minimumSpacing_mm: 100,
    }).warnings.map((warning) => warning.code)).toEqual([
      'LOOP_EXCEEDS_MAX_LENGTH',
      'SPACING_BELOW_MINIMUM',
    ]);
  });

  it('calculates supply and return temperatures around the mean water temperature', () => {
    expect(calculateSupplyReturnTemperature({
      floorSurfaceTemperature_C: 27,
      requiredOutput_W_per_m2: 50,
      thermalResistanceAbovePipe_m2K_per_W: 0.1,
      designWaterTemperatureDrop_K: 5,
    })).toEqual({
      meanWaterTemperature_C: 32,
      supplyTemperature_C: 34.5,
      returnTemperature_C: 29.5,
    });
  });

  it('rejects missing or non-physical positive inputs', () => {
    expect(() => calculateRoomHeatLoss({
      indoorDesignTemperature_C: 20,
      outdoorDesignTemperature_C: 20,
      surfaces: [{ name: 'wall', area_m2: 10, uValue_W_per_m2K: 0.2 }],
    })).toThrow(RangeError);
    expect(() => estimateLoopLength({
      coveredArea_m2: 10,
      spacing_mm: 0,
      connectionLength_m: 2,
      layoutFactor: 1,
    })).toThrow(RangeError);
  });
});