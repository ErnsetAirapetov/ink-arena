import { describe, expect, it } from 'vitest';
import type { Point } from './types.js';
import { centroid, distance, pathLength, resample } from './strokes.js';

describe('distance', () => {
  it('евклидово расстояние между точками', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
  it('ноль для совпадающих точек', () => {
    expect(distance({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(0);
  });
});

describe('pathLength', () => {
  it('сумма длин сегментов', () => {
    const s: Point[] = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 4 + 5 },
    ];
    expect(pathLength(s)).toBe(10);
  });
  it('пустой штрих — длина 0', () => {
    expect(pathLength([])).toBe(0);
  });
  it('штрих из одной точки — длина 0', () => {
    expect(pathLength([{ x: 7, y: 7 }])).toBe(0);
  });
});

describe('centroid', () => {
  it('среднее по координатам', () => {
    const c = centroid([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 3 },
    ]);
    expect(c.x).toBeCloseTo(1);
    expect(c.y).toBeCloseTo(1);
  });
  it('пустой штрих — бросает', () => {
    expect(() => centroid([])).toThrow();
  });
});

describe('resample', () => {
  it('возвращает ровно n точек', () => {
    const s: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(resample(s, 16)).toHaveLength(16);
  });

  it('первая и последняя точки сохраняются', () => {
    const s: Point[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 8, y: 6 },
    ];
    const r = resample(s, 12);
    expect(r[0]).toMatchObject({ x: 0, y: 0 });
    expect(r[r.length - 1]).toMatchObject({ x: 8, y: 6 });
  });

  it('точки становятся равноудалёнными на прямой', () => {
    const s: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const r = resample(s, 11);
    for (let i = 0; i < r.length; i++) {
      expect(r[i].x).toBeCloseTo(i, 5);
    }
  });

  it('чинит сильно неравномерную засэмплированность', () => {
    // Много точек в начале, потом один длинный прыжок.
    const s: Point[] = [
      { x: 0, y: 0 },
      { x: 0.1, y: 0 },
      { x: 0.2, y: 0 },
      { x: 0.3, y: 0 },
      { x: 10, y: 0 },
    ];
    const r = resample(s, 11);
    // Шаги между соседними ресемплированными точками ~равны.
    const step = r[1].x - r[0].x;
    for (let i = 1; i < r.length; i++) {
      expect(r[i].x - r[i - 1].x).toBeCloseTo(step, 3);
    }
  });

  it('пустой штрих — пустой результат', () => {
    expect(resample([], 16)).toEqual([]);
  });

  it('штрих из одной точки — n копий', () => {
    const r = resample([{ x: 5, y: 6 }], 8);
    expect(r).toHaveLength(8);
    for (const p of r) {
      expect(p).toMatchObject({ x: 5, y: 6 });
    }
  });

  it('нулевая длина пути (совпадающие точки) — n копий', () => {
    const r = resample(
      [
        { x: 2, y: 2 },
        { x: 2, y: 2 },
        { x: 2, y: 2 },
      ],
      5,
    );
    expect(r).toHaveLength(5);
    for (const p of r) {
      expect(p).toMatchObject({ x: 2, y: 2 });
    }
  });

  it('n=1 — одна точка', () => {
    expect(
      resample(
        [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
        ],
        1,
      ),
    ).toHaveLength(1);
  });
});
