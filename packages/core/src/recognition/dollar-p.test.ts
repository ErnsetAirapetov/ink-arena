import { describe, expect, it } from 'vitest';
import type { Point } from '../geometry/types.js';
import { normalize, greedyCloudMatch, matchDistanceToScore } from './dollar-p.js';
import { config } from '../config.js';

const N = config.recognition.resamplePoints;

describe('normalize', () => {
  it('даёт ровно N точек', () => {
    const s: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
    ];
    expect(normalize(s, N)).toHaveLength(N);
  });

  it('центрирует облако в начало координат', () => {
    const s: Point[] = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
      { x: 100, y: 200 },
    ];
    const norm = normalize(s, N);
    const cx = norm.reduce((a, p) => a + p.x, 0) / norm.length;
    const cy = norm.reduce((a, p) => a + p.y, 0) / norm.length;
    expect(cx).toBeCloseTo(0, 6);
    expect(cy).toBeCloseTo(0, 6);
  });

  it('инвариантна к масштабу и сдвигу', () => {
    const base: Point[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
    ];
    const scaledShifted: Point[] = base.map((p) => ({ x: p.x * 7 + 50, y: p.y * 7 - 20 }));
    const a = normalize(base, N);
    const b = normalize(scaledShifted, N);
    const d = greedyCloudMatch(a, b);
    expect(d).toBeCloseTo(0, 4);
  });
});

describe('greedyCloudMatch', () => {
  it('идентичные облака — дистанция 0, точность 1', () => {
    const s: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const a = normalize(s, N);
    const d = greedyCloudMatch(a, a);
    expect(d).toBeCloseTo(0, 6);
    expect(matchDistanceToScore(d)).toBeCloseTo(1, 6);
  });

  it('разные формы — дистанция заметно больше нуля', () => {
    const line = normalize(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      N,
    );
    const box = normalize(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 0, y: 0 },
      ],
      N,
    );
    expect(greedyCloudMatch(line, box)).toBeGreaterThan(0.05);
  });
});

describe('matchDistanceToScore', () => {
  it('монотонно убывает и зажат в [0,1]', () => {
    expect(matchDistanceToScore(0)).toBe(1);
    expect(matchDistanceToScore(0.1)).toBeGreaterThan(matchDistanceToScore(0.2));
    expect(matchDistanceToScore(10)).toBe(0);
  });
});
