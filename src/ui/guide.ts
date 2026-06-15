import { boundingBox, type Box, type Point } from '../geometry';

/**
 * Вписывает точки в рамку box с отступом padding: равномерный масштаб
 * (сохраняет пропорцию) и центрирование внутри доступной области.
 */
export function fitPointsToBox(points: Point[], box: Box, padding: number): Point[] {
  const src = boundingBox(points);
  const srcW = src.maxX - src.minX || 1;
  const srcH = src.maxY - src.minY || 1;

  const innerX = box.minX + padding;
  const innerY = box.minY + padding;
  const innerW = box.maxX - box.minX - padding * 2;
  const innerH = box.maxY - box.minY - padding * 2;

  const scale = Math.min(innerW / srcW, innerH / srcH);
  const offsetX = innerX + (innerW - srcW * scale) / 2;
  const offsetY = innerY + (innerH - srcH * scale) / 2;

  return points.map((pt) => ({
    x: offsetX + (pt.x - src.minX) * scale,
    y: offsetY + (pt.y - src.minY) * scale,
    t: 0,
  }));
}
