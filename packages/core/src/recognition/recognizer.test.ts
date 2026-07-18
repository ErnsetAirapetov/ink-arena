import { describe, expect, it } from 'vitest';
import type { Point } from '../geometry/types.js';
import { GLYPHS } from './glyphs.js';
import { idealStroke } from './shapes.js';
import { matchAll, recognizeGlyph } from './recognizer.js';
import { makeRng } from './golden/distort.js';

describe('recognizeGlyph — идеальные глифы', () => {
  for (const g of GLYPHS) {
    it(`${g} узнаётся сам собой с точностью ~1`, () => {
      const res = recognizeGlyph(idealStroke(g));
      expect(res).not.toBeNull();
      expect(res!.glyph).toBe(g);
      expect(res!.accuracy).toBeCloseTo(1, 5);
    });
  }
});

describe('взаимная различимость словаря', () => {
  for (const g of GLYPHS) {
    it(`${g} — строгий лидер, отрыв от второго заметен`, () => {
      const ranked = matchAll(idealStroke(g));
      expect(ranked[0].glyph).toBe(g);
      // Отрыв лидера от ближайшего соперника (все пары различимы).
      expect(ranked[0].accuracy - ranked[1].accuracy).toBeGreaterThan(0.2);
    });
  }
});

describe('recognizeGlyph — отказы', () => {
  it('пустой штрих → null', () => {
    expect(recognizeGlyph([])).toBeNull();
  });

  it('одна точка → null', () => {
    expect(recognizeGlyph([{ x: 5, y: 5 }])).toBeNull();
  });

  it('явная каракуля (случайное блуждание) → ниже порога, null', () => {
    const rng = makeRng(123);
    const scribble: Point[] = [];
    let x = 0;
    let y = 0;
    for (let i = 0; i < 40; i++) {
      x += (rng() - 0.5) * 40;
      y += (rng() - 0.5) * 40;
      scribble.push({ x, y });
    }
    expect(recognizeGlyph(scribble)).toBeNull();
  });
});
