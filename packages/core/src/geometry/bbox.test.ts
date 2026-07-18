import { describe, expect, it } from 'vitest';
import type { Point } from './types.js';
import { boundingBox, bboxContains, bboxGap } from './bbox.js';

describe('boundingBox', () => {
  it('охватывает все точки', () => {
    const pts: Point[] = [
      { x: 1, y: 2 },
      { x: 5, y: -1 },
      { x: 3, y: 4 },
    ];
    const b = boundingBox(pts);
    expect(b).toMatchObject({ minX: 1, minY: -1, maxX: 5, maxY: 4 });
    expect(b.width).toBe(4);
    expect(b.height).toBe(5);
    expect(b.centerX).toBe(3);
    expect(b.centerY).toBe(1.5);
    expect(b.diagonal).toBeCloseTo(Math.hypot(4, 5));
  });

  it('одна точка — вырожденный bbox нулевого размера', () => {
    const b = boundingBox([{ x: 7, y: 8 }]);
    expect(b).toMatchObject({ width: 0, height: 0, centerX: 7, centerY: 8, diagonal: 0 });
  });

  it('пустой набор — бросает', () => {
    expect(() => boundingBox([])).toThrow();
  });
});

describe('bboxContains', () => {
  it('внешний содержит вложенный', () => {
    const outer = boundingBox([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]);
    const inner = boundingBox([
      { x: 2, y: 2 },
      { x: 8, y: 8 },
    ]);
    expect(bboxContains(outer, inner)).toBe(true);
    expect(bboxContains(inner, outer)).toBe(false);
  });
});

describe('bboxGap', () => {
  it('перекрывающиеся — зазор 0', () => {
    const a = boundingBox([
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ]);
    const b = boundingBox([
      { x: 3, y: 3 },
      { x: 8, y: 8 },
    ]);
    expect(bboxGap(a, b)).toBe(0);
  });

  it('раздельные по X — зазор равен промежутку', () => {
    const a = boundingBox([
      { x: 0, y: 0 },
      { x: 2, y: 2 },
    ]);
    const b = boundingBox([
      { x: 5, y: 0 },
      { x: 7, y: 2 },
    ]);
    expect(bboxGap(a, b)).toBe(3);
  });

  it('раздельные по диагонали — евклидов зазор между углами', () => {
    const a = boundingBox([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    const b = boundingBox([
      { x: 4, y: 5 },
      { x: 6, y: 7 },
    ]);
    expect(bboxGap(a, b)).toBeCloseTo(Math.hypot(3, 4));
  });
});
