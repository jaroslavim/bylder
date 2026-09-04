import { describe, expect, it } from 'vitest';
import fixture from '@bylder/project-schema/src/fixtures/project-v1.json';
import { createInstallationReport } from './index';

describe('createInstallationReport', () => {
  it('creates deterministic heat-loss, schedule, and layout sections', () => {
    const report = createInstallationReport(fixture);

    expect(report).toEqual({
      metadata: { title: 'Example house', preparedBy: 'Bylder', generatedAt: '2026-01-01T00:00:00.000Z', units: 'SI' },
      heatLossSheet: {
        rooms: [{ roomId: 'room-1', roomName: 'Living room', heatLoss: 1200 }],
        totalHeatLoss: 1200,
      },
      loopManifoldSchedule: [{
        loopId: 'loop-1', loopName: 'Living loop', manifoldId: 'manifold-1', manifoldName: 'Ground manifold',
        roomId: 'room-1', length: 82.5, designFlow: 2.1, calculatedHeatOutput: 1200,
      }],
      layout: [{ floorId: 'floor-1', floorName: 'Ground floor', roomId: 'room-1', roomName: 'Living room' }],
      warnings: [],
    });
  });

  it('rejects unvalidated v0 data instead of reading UI state', () => {
    expect(() => createInstallationReport({ version: 0 })).toThrow();
  });
});
