import { describe, it, expect } from 'vitest';
import { clusterStrokes } from '../src/recognition/clustering';
import type { Stroke } from '../src/drawing/stroke';
import type { Point } from '../src/geometry';

const pt = (x: number, y: number): Point => ({ x, y, t: 0 });
// линия из двух точек: (x,y) и (x+10,y+10)
const st = (x: number, y: number): Stroke => ({
  points: [pt(x, y), pt(x + 10, y + 10)],
  duration: 0,
});

describe('clusterStrokes', () => {
  it('пустой ввод → пусто', () => {
    expect(clusterStrokes([], 50)).toEqual([]);
  });

  it('две близкие линии → одна группа', () => {
    const groups = clusterStrokes([st(0, 0), st(15, 0)], 50);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });

  it('две далёкие линии → две группы', () => {
    const groups = clusterStrokes([st(0, 0), st(500, 0)], 50);
    expect(groups).toHaveLength(2);
  });

  it('транзитивность: A~B, B~C, A далеко от C → одна группа', () => {
    // A:[0..10], B:[60..70], C:[120..130]; gap A-B=50, B-C=50 (< 55), A-C=110
    const groups = clusterStrokes([st(0, 0), st(60, 0), st(120, 0)], 55);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(3);
  });
});
