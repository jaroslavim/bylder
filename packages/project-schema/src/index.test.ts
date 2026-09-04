import { describe, expect, it } from 'vitest';
import fixture from './fixtures/project-v0.json';
import { ProjectSchema } from './index';

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