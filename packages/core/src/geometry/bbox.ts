import type { BoundingBox, Stroke } from './types.js';

// Осепараллельный ограничивающий прямоугольник набора точек.
// Пустой набор границ не имеет.
export function boundingBox(points: Stroke): BoundingBox {
  if (points.length === 0) {
    throw new Error('boundingBox: пустой набор точек');
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const width = maxX - minX;
  const height = maxY - minY;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    diagonal: Math.hypot(width, height),
  };
}

// Полностью ли outer содержит inner (вложенность, правило Р26).
export function bboxContains(outer: BoundingBox, inner: BoundingBox): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY &&
    inner.maxY <= outer.maxY
  );
}

// Зазор между двумя прямоугольниками: 0 при пересечении, иначе евклидово
// расстояние между ближайшими краями/углами.
export function bboxGap(a: BoundingBox, b: BoundingBox): number {
  const dx = Math.max(0, Math.max(a.minX - b.maxX, b.minX - a.maxX));
  const dy = Math.max(0, Math.max(a.minY - b.maxY, b.minY - a.maxY));
  return Math.hypot(dx, dy);
}
