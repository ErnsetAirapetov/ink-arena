import { describe, it, expect } from 'vitest';
import { distance, pathLength, type Point } from '../src/geometry';

const p = (x: number, y: number, t = 0): Point => ({ x, y, t });

describe('geometry', () => {
  it('distance считает евклидово расстояние', () => {
    expect(distance(p(0, 0), p(3, 4))).toBe(5);
  });

  it('pathLength суммирует длину ломаной', () => {
    expect(pathLength([p(0, 0), p(0, 10), p(10, 10)])).toBe(20);
  });

  it('pathLength для одной точки равна 0', () => {
    expect(pathLength([p(5, 5)])).toBe(0);
  });
});

import { boundingBox, boxGap } from '../src/geometry';

describe('boundingBox / boxGap', () => {
  it('boundingBox охватывает все точки', () => {
    const box = boundingBox([p(10, 20), p(30, 5), p(0, 40)]);
    expect(box).toEqual({ minX: 0, minY: 5, maxX: 30, maxY: 40 });
  });

  it('boxGap = 0 для пересекающихся боксов', () => {
    const a = boundingBox([p(0, 0), p(10, 10)]);
    const b = boundingBox([p(5, 5), p(15, 15)]);
    expect(boxGap(a, b)).toBe(0);
  });

  it('boxGap считает горизонтальный зазор', () => {
    const a = boundingBox([p(0, 0), p(10, 10)]);
    const b = boundingBox([p(25, 0), p(35, 10)]);
    expect(boxGap(a, b)).toBe(15);
  });

  it('boxGap считает диагональный зазор', () => {
    const a = boundingBox([p(0, 0), p(10, 10)]);
    const b = boundingBox([p(13, 14), p(20, 20)]);
    expect(boxGap(a, b)).toBe(5); // dx=3, dy=4 → 5
  });
});
