import { describe, it, expect } from 'vitest';
import { fitPointsToBox } from '../src/ui/guide';
import type { Point } from '../src/geometry';

const p = (x: number, y: number): Point => ({ x, y, t: 0 });
const square = [p(0, 0), p(10, 0), p(10, 10), p(0, 10)];

describe('fitPointsToBox', () => {
  it('вписывает квадрат в высокую рамку с центрированием по вертикали', () => {
    const box = { minX: 0, minY: 0, maxX: 100, maxY: 200 };
    const out = fitPointsToBox(square, box, 0);
    expect(out).toEqual([
      { x: 0, y: 50, t: 0 },
      { x: 100, y: 50, t: 0 },
      { x: 100, y: 150, t: 0 },
      { x: 0, y: 150, t: 0 },
    ]);
  });

  it('учитывает отступ', () => {
    const box = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    const out = fitPointsToBox(square, box, 10);
    expect(out[0]).toEqual({ x: 10, y: 10, t: 0 });
    expect(out[2]).toEqual({ x: 90, y: 90, t: 0 });
  });

  it('все точки остаются внутри рамки', () => {
    const box = { minX: 5, minY: 5, maxX: 125, maxY: 95 };
    const out = fitPointsToBox(square, box, 8);
    for (const pt of out) {
      expect(pt.x).toBeGreaterThanOrEqual(5);
      expect(pt.x).toBeLessThanOrEqual(125);
      expect(pt.y).toBeGreaterThanOrEqual(5);
      expect(pt.y).toBeLessThanOrEqual(95);
    }
  });
});
