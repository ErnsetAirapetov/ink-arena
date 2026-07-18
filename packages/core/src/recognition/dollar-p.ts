import { config } from '../config.js';
import { boundingBox } from '../geometry/bbox.js';
import { centroid, distance, resample } from '../geometry/strokes.js';
import type { Point, Stroke } from '../geometry/types.js';

// Реализация $P (point-cloud recognizer, Vatavu, Anthony & Wobbrock 2012),
// написанная с нуля по TDD (Р43 — код прототипа не переносится).
//
// $P ротационно-ЧУВСТВИТЕЛЕН: облака не выравниваются по углу. Для нас это
// плюс — `/` отличается от `\`, а ориентация волны/S несёт смысл.

// Нормализация штриха: ресемплинг до n точек → масштаб в единичный бокс
// (равномерно, по большей стороне) → центрирование центроида в (0,0).
export function normalize(stroke: Stroke, n: number = config.recognition.resamplePoints): Point[] {
  const pts = resample(stroke, n);
  if (pts.length === 0) return [];

  const bb = boundingBox(pts);
  const scale = Math.max(bb.width, bb.height);
  const scaled: Point[] =
    scale === 0 ? pts.map((p) => ({ x: p.x, y: p.y })) : pts.map((p) => ({ x: p.x / scale, y: p.y / scale }));

  const c = centroid(scaled);
  return scaled.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
}

// Суммарный вес одного прохода cloudDistance: Σ_{k=0..n-1}(1 - k/n) = (n+1)/2.
function weightSum(n: number): number {
  return (n + 1) / 2;
}

// Взвешенная жадная дистанция от облака pts1 к pts2, старт с индекса `start`.
function cloudDistance(pts1: Point[], pts2: Point[], start: number): number {
  const n = pts1.length;
  const matched = new Array<boolean>(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let min = Infinity;
    let index = -1;
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue;
      const d = distance(pts1[i], pts2[j]);
      if (d < min) {
        min = d;
        index = j;
      }
    }
    if (index >= 0) matched[index] = true;
    const weight = 1 - ((i - start + n) % n) / n;
    sum += weight * min;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

// Согласованное $P-сопоставление двух нормализованных облаков. Возвращает
// средневзвешенную дистанцию на точку (в нормированных координатах), 0 —
// идеальное совпадение. Оба облака должны быть одной длины n.
export function greedyCloudMatch(pts1: Point[], pts2: Point[]): number {
  const n = pts1.length;
  if (n === 0 || pts2.length !== n) {
    throw new Error('greedyCloudMatch: облака должны быть непусты и одной длины');
  }
  const step = Math.max(1, Math.floor(Math.pow(n, 0.5)));
  let min = Infinity;
  for (let i = 0; i < n; i += step) {
    const d1 = cloudDistance(pts1, pts2, i);
    const d2 = cloudDistance(pts2, pts1, i);
    min = Math.min(min, d1, d2);
  }
  // Нормируем на сумму весов → средневзвешенная дистанция на точку.
  return min / weightSum(n);
}

// Перевод дистанции $P в точность 0..1 (скилл руки, множитель силы Р4).
// Линейно убывает до нуля на scoreRefDistance и зажимается в [0,1].
export function matchDistanceToScore(distanceValue: number): number {
  const ref = config.recognition.scoreRefDistance;
  return Math.min(1, Math.max(0, 1 - distanceValue / ref));
}
