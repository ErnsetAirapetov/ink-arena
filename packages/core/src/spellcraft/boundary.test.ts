import { describe, expect, it } from 'vitest';
import { boundingBox } from '../geometry/bbox.js';
import type { Stroke } from '../geometry/types.js';
import { circleGeom, classifyGlyph, isCoreCentered } from './boundary.js';
import { ring } from './fixtures.js';

// Прямоугольный штрих с центром (cx,cy) и полуразмером half.
const box = (cx: number, cy: number, half: number): Stroke => [
  { x: cx - half, y: cy - half },
  { x: cx + half, y: cy - half },
  { x: cx + half, y: cy + half },
  { x: cx - half, y: cy + half },
];

const circle = circleGeom(ring(400, 300, 200));

describe('circleGeom — центр и радиус круга', () => {
  it('снимает центр и радиус с bbox круга', () => {
    expect(circle.cx).toBeCloseTo(400, 6);
    expect(circle.cy).toBeCloseTo(300, 6);
    expect(circle.radius).toBeCloseTo(200, 6);
  });
});

describe('classifyGlyph — положение глифа относительно круга (Р26 п.6, Р27)', () => {
  it('маленький глиф в центре — внутри', () => {
    expect(classifyGlyph(circle, boundingBox(box(400, 300, 30)))).toBe('inside');
  });

  it('глиф целиком за кругом — снаружи', () => {
    expect(classifyGlyph(circle, boundingBox(box(700, 300, 20)))).toBe('outside');
  });

  it('глиф, пересекающий кольцо круга, — на границе', () => {
    expect(classifyGlyph(circle, boundingBox(box(600, 300, 40)))).toBe('boundary');
  });
});

describe('isCoreCentered — центрированность ядра (Р26 п.2)', () => {
  it('ядро в центре круга — центрировано', () => {
    expect(isCoreCentered(circle, boundingBox(box(400, 300, 60)))).toBe(true);
  });

  it('ядро далеко от центра — не центрировано', () => {
    expect(isCoreCentered(circle, boundingBox(box(560, 300, 20)))).toBe(false);
  });
});
