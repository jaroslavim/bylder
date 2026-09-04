import { describe, expect, it } from 'vitest';
import fixture from './fixtures/project-v0.json';
import v1Fixture from './fixtures/project-v1.json';
import { ProjectSchema, ProjectV1Schema, migrateProject } from './index';

describe('ProjectSchema v0', () => {
  it('parses the golden v0 project fixture', () => {
    const result = ProjectSchema.safeParse(fixture);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.floors[0].rooms[0].components[0].props).toEqual({ loopId: 'loop-1' });
    }
  });

  it('rejects invalid versions, geometry, and discipline-specific props', () => {
    const invalidProject = {
      ...fixture,
      version: 1,
      floors: [{
        ...fixture.floors[0],
        rooms: [{
          ...fixture.floors[0].rooms[0],
          polygon: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
          components: [{
            ...fixture.floors[0].rooms[0].components[0],
            discipline: 'electrical',
            props: { loopId: 'not-electrical-props' },
          }],
        }],
      }],
    };

    expect(ProjectSchema.safeParse(invalidProject).success).toBe(false);
  });

  it('has stable serialization for the golden fixture', () => {
    const project = ProjectSchema.parse(fixture);

    expect(JSON.stringify(project, null, 2)).toBe(JSON.stringify(fixture, null, 2));
  });
});

describe('ProjectSchema v1 and migrations', () => {
  it('parses the v1 golden fixture with the extended heating model', () => {
    const result = ProjectV1Schema.safeParse(v1Fixture);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.loops[0].calculatedHeatOutput).toBe(1200);
    }
  });

  it('migrates v0 without changing its geometry or losing room identity', () => {
    const migrated = migrateProject(fixture);

    expect(migrated.version).toBe(1);
    expect(migrated.floors[0].rooms[0]).toEqual(fixture.floors[0].rooms[0]);
    expect(migrated.heatingRooms[0].roomId).toBe('room-1');
    expect(ProjectV1Schema.safeParse(migrated).success).toBe(true);
  });

  it('accepts both persisted versions through the compatibility parser', () => {
    expect(ProjectSchema.parse(fixture).version).toBe(0);
    expect(ProjectSchema.parse(v1Fixture).version).toBe(1);
  });
});