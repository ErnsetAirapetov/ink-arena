import { describe, expect, it } from 'vitest';
import { config } from '../../config.js';
import type { Point, Stroke } from '../../geometry/types.js';
import { recognizeGlyph } from '../recognizer.js';
import { isClosingCircle } from '../circle.js';
import { GOLDEN_CORPUS, enclosingCircle } from './corpus.js';
import { jitter, makeRng, rotate, scale, translate } from './distort.js';

const MIN = config.recognition.minAccuracy;

// Набор разумных искажений одного штриха (масштаб, поворот ≤8°, шум ≤3.5%,
// сдвиг) — детерминированный, воспроизводимый по сиду.
function variants(stroke: Stroke, seed: number): { label: string; stroke: Point[] }[] {
  const rng = makeRng(seed);
  const deg = 8;
  return [
    { label: 'clean', stroke: stroke.map((p) => ({ x: p.x, y: p.y })) },
    { label: 'scaled-up', stroke: scale(stroke, 2.5) },
    { label: 'scaled-down', stroke: scale(stroke, 0.4) },
    { label: 'rot+8', stroke: rotate(stroke, (deg * Math.PI) / 180) },
    { label: 'rot-8', stroke: rotate(stroke, (-deg * Math.PI) / 180) },
    { label: 'jitter3', stroke: jitter(stroke, 0.03, rng) },
    {
      label: 'combined',
      stroke: jitter(rotate(translate(scale(stroke, 1.6), 120, -80), (5 * Math.PI) / 180), 0.03, rng),
    },
  ];
}

describe('golden-корпус Р32: пер-глифное распознавание', () => {
  let seed = 1;
  for (const spell of GOLDEN_CORPUS) {
    for (let gi = 0; gi < spell.glyphs.length; gi++) {
      const { glyph, stroke } = spell.glyphs[gi];
      const localSeed = seed++;
      for (const v of variants(stroke, localSeed)) {
        it(`${spell.name} · ${glyph}#${gi} · ${v.label} → ${glyph} (≥ порога)`, () => {
          const res = recognizeGlyph(v.stroke);
          expect(res).not.toBeNull();
          expect(res!.glyph).toBe(glyph);
          expect(res!.accuracy).toBeGreaterThanOrEqual(MIN);
        });
      }
    }
  }
});

describe('golden-корпус Р32: чистые эталоны распознаются уверенно', () => {
  for (const spell of GOLDEN_CORPUS) {
    it(`${spell.name}: все глифы с высокой точностью`, () => {
      for (const { glyph, stroke } of spell.glyphs) {
        const res = recognizeGlyph(stroke);
        expect(res?.glyph).toBe(glyph);
        expect(res!.accuracy).toBeGreaterThan(0.85);
      }
    });
  }
});

describe('golden-корпус Р32: замыкающий круг и отказы', () => {
  it('круг вокруг композиции детектируется как замыкающий', () => {
    expect(isClosingCircle(enclosingCircle(450, 300, 260))).toBe(true);
  });

  it('шумный охватывающий круг — тоже', () => {
    const noisy = jitter(enclosingCircle(450, 300, 260), 0.04, makeRng(99));
    expect(isClosingCircle(noisy)).toBe(true);
  });

  it('каракули не распознаются (несколько сидов)', () => {
    for (const s of [11, 202, 3003, 40404]) {
      const rng = makeRng(s);
      const scribble: Point[] = [];
      let x = 200;
      let y = 200;
      for (let i = 0; i < 45; i++) {
        x += (rng() - 0.5) * 50;
        y += (rng() - 0.5) * 50;
        scribble.push({ x, y });
      }
      expect(recognizeGlyph(scribble)).toBeNull();
    }
  });
});
