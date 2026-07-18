import { describe, expect, it } from 'vitest';
import type { Point } from '../geometry/types.js';
import { isClosingCircle } from './circle.js';
import { idealStroke } from './shapes.js';
import { jitter, makeRng } from './golden/distort.js';

function circle(cx: number, cy: number, r: number, n = 40): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (2 * Math.PI * i) / n;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

describe('isClosingCircle', () => {
  it('идеальный круг — да', () => {
    expect(isClosingCircle(circle(100, 100, 50))).toBe(true);
  });

  it('шумный круг — да', () => {
    const noisy = jitter(circle(200, 150, 80), 0.04, makeRng(3));
    expect(isClosingCircle(noisy)).toBe(true);
  });

  it('квадрат — нет (замкнут, но не круглый)', () => {
    expect(isClosingCircle(idealStroke('earth'))).toBe(false);
  });

  it('треугольник — нет', () => {
    expect(isClosingCircle(idealStroke('fire'))).toBe(false);
  });

  it('спираль (heal) — нет: разомкнута (конец у центра, не у старта) и радиус не постоянен', () => {
    // heal — не глиф-круг, а осмысленный элемент словаря ($P, glyphs.ts):
    // важно, чтобы детектор замыкающего круга (эвристика, не $P) не путал их.
    expect(isClosingCircle(idealStroke('heal'))).toBe(false);
  });

  it('открытая дуга (щит) — нет (не замкнута)', () => {
    expect(isClosingCircle(idealStroke('shield'))).toBe(false);
  });

  it('прямая линия — нет', () => {
    expect(
      isClosingCircle([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
      ]),
    ).toBe(false);
  });

  it('пустой/короткий штрих — нет', () => {
    expect(isClosingCircle([])).toBe(false);
    expect(isClosingCircle([{ x: 0, y: 0 }])).toBe(false);
  });
});
