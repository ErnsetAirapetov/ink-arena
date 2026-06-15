import { describe, it, expect } from 'vitest';
import { recognize } from '../src/recognition/recognizer';
import { GLYPHS } from '../src/recognition/glyphs';
import type { Point } from '../src/geometry';

const fire = GLYPHS.find((g) => g.id === 'fire')!;

// слегка зашумлённая копия точек эталона
function jitter(points: Point[], amount: number): Point[] {
  return points.map((pt, i) => ({
    x: pt.x + (i % 2 === 0 ? amount : -amount),
    y: pt.y + (i % 2 === 0 ? -amount : amount),
    t: 0,
  }));
}

describe('recognize ($P)', () => {
  it('узнаёт глиф, повторяющий эталон', () => {
    const res = recognize(fire.points, GLYPHS)!;
    expect(res.glyph.id).toBe('fire');
    expect(res.score).toBeGreaterThan(0.85);
  });

  it('score всегда в диапазоне [0, 1]', () => {
    const res = recognize(jitter(fire.points, 15), GLYPHS)!;
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(1);
  });

  it('более точный рисунок даёт больший score, чем искажённый', () => {
    const clean = recognize(fire.points, GLYPHS)!;
    const noisy = recognize(jitter(fire.points, 25), GLYPHS)!;
    expect(clean.score).toBeGreaterThan(noisy.score);
  });

  it('возвращает null на пустом или одной точке', () => {
    expect(recognize([], GLYPHS)).toBeNull();
    expect(recognize([{ x: 1, y: 1, t: 0 }], GLYPHS)).toBeNull();
  });
});
