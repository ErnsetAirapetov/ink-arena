// Рендер блокнота мага: зона рисования (нижняя треть, Р10), нарисованные
// штрихи и живой штрих под пальцем, вспышка «распознан» (Р31). Визуальный
// модуль — проверяется руками.
import { clientConfig } from '../config';
import type { Layout, Vec2 } from '../layout';
import type { DrawnStroke } from './types';

function tracePath(ctx: CanvasRenderingContext2D, pts: readonly Vec2[]): void {
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  // Одиночная точка (тап) — маленькая засечка, чтобы была видна.
  if (pts.length === 1) ctx.lineTo(pts[0].x + 0.5, pts[0].y + 0.5);
}

export function drawNotebook(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  strokes: readonly DrawnStroke[],
  liveStroke: readonly Vec2[] | null,
  now: number,
): void {
  const c = clientConfig.colors;
  const nb = layout.notebook;

  // Фон блокнота и разделительная граница с ареной.
  ctx.fillStyle = c.notebookBg;
  ctx.fillRect(nb.x, nb.y, nb.w, nb.h);
  ctx.strokeStyle = c.notebookBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(nb.x, nb.y);
  ctx.lineTo(nb.x + nb.w, nb.y);
  ctx.stroke();

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Завершённые штрихи: обычный цвет либо подсветка «распознан», пока не истёк
  // таймер вспышки. Вспышка приватна и нейтральна — без имени/чисел (Р31).
  for (const s of strokes) {
    const flashing = now < s.recognizedUntil;
    ctx.strokeStyle = flashing ? c.recognized : c.stroke;
    ctx.lineWidth = flashing ? 5 : 3;
    tracePath(ctx, s.points);
    ctx.stroke();
  }

  // Живой штрих под пальцем.
  if (liveStroke && liveStroke.length > 0) {
    ctx.strokeStyle = c.stroke;
    ctx.lineWidth = 3;
    tracePath(ctx, liveStroke);
    ctx.stroke();
  }
}
