import { describe, expect, it } from 'vitest';
import type { Stroke } from './types.js';
import { clusterStrokes } from './cluster.js';

// Маленький квадратный штрих около заданного центра (сторона 2).
function box(cx: number, cy: number, half = 1): Stroke {
  return [
    { x: cx - half, y: cy - half },
    { x: cx + half, y: cy - half },
    { x: cx + half, y: cy + half },
    { x: cx - half, y: cy + half },
    { x: cx - half, y: cy - half },
  ];
}

describe('clusterStrokes', () => {
  it('пустой ввод — нет кластеров', () => {
    expect(clusterStrokes([])).toEqual([]);
  });

  it('один штрих — один кластер', () => {
    expect(clusterStrokes([box(0, 0)])).toEqual([[0]]);
  });

  it('близкие штрихи объединяются, далёкий — отдельно', () => {
    const strokes = [box(0, 0), box(1.5, 0), box(100, 100)];
    const clusters = clusterStrokes(strokes);
    // Первые два рядом → один кластер; третий далеко → свой.
    const sorted = clusters.map((c) => [...c].sort((a, b) => a - b)).sort((a, b) => a[0] - b[0]);
    expect(sorted).toEqual([[0, 1], [2]]);
  });

  it('вложенный штрих попадает в кластер объемлющего (охват композиции)', () => {
    // Большой контур и маленький глиф внутри — как круг вокруг ядра (Р26).
    const outer = box(0, 0, 10);
    const inner = box(0, 0, 1);
    const clusters = clusterStrokes([outer, inner]);
    expect(clusters).toHaveLength(1);
    expect([...clusters[0]].sort((a, b) => a - b)).toEqual([0, 1]);
  });

  it('транзитивность: A-B близки, B-C близки → все в одном кластере', () => {
    const strokes = [box(0, 0), box(1.5, 0), box(3, 0)];
    const clusters = clusterStrokes(strokes);
    expect(clusters).toHaveLength(1);
    expect([...clusters[0]].sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });
});
