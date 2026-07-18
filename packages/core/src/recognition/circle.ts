import { config } from '../config.js';
import { boundingBox } from '../geometry/bbox.js';
import { centroid, distance, resample } from '../geometry/strokes.js';
import type { Stroke } from '../geometry/types.js';

// Детекция замыкающего круга (Р27) — жест-подтверждение, НЕ глиф словаря,
// поэтому распознаётся отдельно от $P: по замкнутости и охвату, а не по
// сходству с эталоном. Круг обязан быть замкнутым и круглым; квадрат и
// треугольник (тоже замкнутые) отсекаются по разбросу радиусов.

// Коэффициент вариации радиусов от центроида (σ/среднее) на равномерно
// ресемплированном штрихе. У круга ≈0, растёт с «угловатостью» контура.
function radiusCoV(stroke: Stroke): number {
  const pts = resample(stroke, config.recognition.circle.resamplePoints);
  const c = centroid(pts);
  const rad = pts.map((p) => Math.hypot(p.x - c.x, p.y - c.y));
  const mean = rad.reduce((a, b) => a + b, 0) / rad.length;
  if (mean === 0) return Infinity;
  const variance = rad.reduce((a, b) => a + (b - mean) ** 2, 0) / rad.length;
  return Math.sqrt(variance) / mean;
}

// Суммарный модуль поворота вдоль ломаной (≈2π у замкнутой петли).
function totalTurning(stroke: Stroke): number {
  let sum = 0;
  for (let i = 1; i < stroke.length - 1; i++) {
    const ax = stroke[i].x - stroke[i - 1].x;
    const ay = stroke[i].y - stroke[i - 1].y;
    const bx = stroke[i + 1].x - stroke[i].x;
    const by = stroke[i + 1].y - stroke[i].y;
    const cross = ax * by - ay * bx;
    const dot = ax * bx + ay * by;
    sum += Math.abs(Math.atan2(cross, dot));
  }
  return sum;
}

// Является ли штрих замыкающим кругом.
export function isClosingCircle(stroke: Stroke): boolean {
  const cfg = config.recognition.circle;
  if (stroke.length < cfg.minPoints) return false;

  const bb = boundingBox(stroke);
  if (bb.diagonal === 0) return false;

  // 1. Замкнутость: концы близко относительно размера.
  const gap = distance(stroke[0], stroke[stroke.length - 1]);
  if (gap / bb.diagonal > cfg.maxEndpointGapRatio) return false;

  // 2. Петля: накопленный поворот близок к полному обороту.
  if (totalTurning(stroke) < cfg.minTurning) return false;

  // 3. Круглость: малый разброс радиусов от центроида (круг ≪ квадрат).
  return radiusCoV(stroke) <= cfg.maxRadiusCoV;
}
