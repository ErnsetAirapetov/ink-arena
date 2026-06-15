import { distance, pathLength, type Point } from '../geometry';
import type { Glyph } from './glyphs';

const NUM_POINTS = 32;

export interface MatchResult {
  glyph: Glyph;
  /** Похожесть 0..1 (1 — идеальное совпадение). */
  score: number;
}

function resample(points: Point[], n: number): Point[] {
  const interval = pathLength(points) / (n - 1);
  let accumulated = 0;
  const pts = points.map((pt) => ({ ...pt }));
  const result: Point[] = [{ ...pts[0] }];

  for (let i = 1; i < pts.length; i++) {
    const d = distance(pts[i - 1], pts[i]);
    if (accumulated + d >= interval) {
      const ratio = (interval - accumulated) / d;
      const q: Point = {
        x: pts[i - 1].x + ratio * (pts[i].x - pts[i - 1].x),
        y: pts[i - 1].y + ratio * (pts[i].y - pts[i - 1].y),
        t: 0,
      };
      result.push(q);
      pts.splice(i, 0, q);
      accumulated = 0;
    } else {
      accumulated += d;
    }
  }
  while (result.length < n) result.push({ ...pts[pts.length - 1] });
  return result;
}

function scaleToUnit(points: Point[]): Point[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of points) {
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  }
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  return points.map((pt) => ({ x: (pt.x - minX) / size, y: (pt.y - minY) / size, t: 0 }));
}

function translateToOrigin(points: Point[]): Point[] {
  let cx = 0, cy = 0;
  for (const pt of points) { cx += pt.x; cy += pt.y; }
  cx /= points.length;
  cy /= points.length;
  return points.map((pt) => ({ x: pt.x - cx, y: pt.y - cy, t: 0 }));
}

export function normalize(points: Point[]): Point[] {
  return translateToOrigin(scaleToUnit(resample(points, NUM_POINTS)));
}

function cloudDistance(a: Point[], b: Point[], start: number): number {
  const n = a.length;
  const matched = new Array<boolean>(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let min = Infinity;
    let index = -1;
    for (let j = 0; j < n; j++) {
      if (!matched[j]) {
        const d = distance(a[i], b[j]);
        if (d < min) { min = d; index = j; }
      }
    }
    if (index >= 0) matched[index] = true;
    const weight = 1 - ((i - start + n) % n) / n;
    sum += weight * min;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

function greedyMatch(a: Point[], b: Point[]): number {
  const n = a.length;
  const step = Math.max(1, Math.floor(Math.pow(n, 0.5)));
  let min = Infinity;
  for (let i = 0; i < n; i += step) {
    min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
  }
  return min;
}

export function recognize(points: Point[], templates: Glyph[]): MatchResult | null {
  if (points.length < 2 || templates.length === 0) return null;

  const candidate = normalize(points);
  let best: Glyph | null = null;
  let bestDist = Infinity;
  for (const tmpl of templates) {
    const d = greedyMatch(candidate, normalize(tmpl.points));
    if (d < bestDist) { bestDist = d; best = tmpl; }
  }
  if (!best) return null;

  // Нормировка дистанции в score. Делитель подобран так, чтобы точное
  // совпадение давало score ~1, а явно чужой глиф — близко к 0.
  const score = Math.max(0, Math.min(1, 1 - bestDist / (0.4 * NUM_POINTS)));
  return { glyph: best, score };
}
