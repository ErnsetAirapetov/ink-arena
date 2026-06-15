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
