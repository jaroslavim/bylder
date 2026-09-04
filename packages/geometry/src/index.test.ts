import { describe, expect, it } from 'vitest';

import {
  applyTransform,
  boundingBox,
  distance,
  inverseTransform,
  pointInRectangle,
  resizeRectangle,
  rotatePoint,
  snapPoint,
  type CoordinateTransform,
  type Point,
  type Rect,
} from './index';

describe('geometry foundations', () => {
  it('calculates Euclidean distance', () => {
    const first: Point = { x: 1, y: 2 };
    const second: Point = { x: 4, y: 6 };

    expect(distance(first, second)).toBe(5);
  });

  it('calculates the axis-aligned bounding box', () => {
    const points: Point[] = [
      { x: 4, y: 8 },
      { x: -2, y: 3 },
      { x: 5, y: -1 },
    ];

    expect(boundingBox(points)).toEqual({
      x: -2,
      y: -1,
      width: 7,
      height: 9,
    });
  });

  it('includes rectangle edges in point containment', () => {
    const rectangle: Rect = { x: 10, y: 20, width: 30, height: 40 };

    expect(pointInRectangle({ x: 10, y: 60 }, rectangle)).toBe(true);
    expect(pointInRectangle({ x: 41, y: 60 }, rectangle)).toBe(false);
  });

  it('applies and reverses a coordinate transform', () => {
    const transform: CoordinateTransform = {
      translation: { x: 10, y: -4 },
      scale: { x: 2, y: 3 },
    };
    const point = { x: 5, y: 2 };

    expect(applyTransform(point, transform)).toEqual({ x: 20, y: 2 });
    expect(inverseTransform({ x: 20, y: 2 }, transform)).toEqual(point);
  });

  it('rejects empty bounds and non-invertible transforms', () => {
    expect(() => boundingBox([])).toThrow(RangeError);
    expect(() =>
      inverseTransform(
        { x: 1, y: 1 },
        { translation: { x: 0, y: 0 }, scale: { x: 0, y: 1 } },
      ),
    ).toThrow(RangeError);
  });

  it('snaps points to the default 100mm grid', () => {
    expect(snapPoint({ x: 149, y: 251 })).toEqual({ x: 100, y: 300 });
  });

  it('rotates points and keeps room resizing above the minimum size', () => {
    expect(rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90).x).toBeCloseTo(0);
    expect(rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90).y).toBeCloseTo(10);
    expect(resizeRectangle({ x: 0, y: 0, width: 400, height: 300 }, { left: 350 })).toEqual({
     x: 300,
     y: 0,
     width: 100,
     height: 300,
  });
  });
});