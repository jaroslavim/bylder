import { describe, expect, it } from 'vitest';
import { generateHeatingLoop } from './index';

describe('heating loop preview', () => {
  it('starts at the manifold and creates a deterministic serpentine polyline', () => {
    const loop = generateHeatingLoop({ x: 0, y: 0, width: 1000, height: 500 }, { x: 100, y: 100 }, 0, 2);

    expect(loop.points[0]).toEqual({ x: 100, y: 100 });
    expect(loop.points.length).toBe(18);
    expect(loop.points.at(-1)).toEqual({ x: 333.3333333333333, y: 500 });
  });
});
