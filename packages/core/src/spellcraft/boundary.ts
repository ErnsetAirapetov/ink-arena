import { config } from '../config.js';
import { boundingBox } from '../geometry/bbox.js';
import type { BoundingBox, Stroke } from '../geometry/types.js';

// Геометрия замыкающего круга (Р27): центр и радиус, снятые с bbox штриха
// круга. Круг рисуют примерно круглым (это гарантирует isClosingCircle),
// поэтому радиус — среднее полуразмеров bbox.
export interface CircleGeom {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
}

export function circleGeom(circleStroke: Stroke): CircleGeom {
  const bb = boundingBox(circleStroke);
  return { cx: bb.centerX, cy: bb.centerY, radius: (bb.width + bb.height) / 4 };
}

// Положение глифа относительно круга (Р26 п.6, Р27).
export type RingZone = 'inside' | 'boundary' | 'outside';

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Классификация bbox глифа по кольцу неоднозначности вокруг радиуса круга.
// dMax — самый дальний угол bbox от центра, dMin — ближайшая точка bbox к
// центру (0, если центр внутри bbox). Кольцо шириной margin·R:
//   целиком внутри внутренней границы → inside;
//   целиком за внешней границей       → outside;
//   пересекает кольцо                 → boundary (нельзя решить внутри/снаружи).
export function classifyGlyph(
  circle: CircleGeom,
  box: BoundingBox,
  margin: number = config.spellcraft.boundaryMarginRatio,
): RingZone {
  const corners: ReadonlyArray<readonly [number, number]> = [
    [box.minX, box.minY],
    [box.maxX, box.minY],
    [box.minX, box.maxY],
    [box.maxX, box.maxY],
  ];
  let dMax = 0;
  for (const [x, y] of corners) {
    const d = Math.hypot(x - circle.cx, y - circle.cy);
    if (d > dMax) dMax = d;
  }
  const nx = clamp(circle.cx, box.minX, box.maxX);
  const ny = clamp(circle.cy, box.minY, box.maxY);
  const dMin = Math.hypot(circle.cx - nx, circle.cy - ny);

  const inner = circle.radius * (1 - margin);
  const outer = circle.radius * (1 + margin);
  if (dMax <= inner) return 'inside';
  if (dMin >= outer) return 'outside';
  return 'boundary';
}

// Достаточно ли ядро центрировано в круге (Р26 п.2 «в центре»). Допуск —
// config.spellcraft.coreCenterToleranceRatio (открытый параметр, Р36).
export function isCoreCentered(
  circle: CircleGeom,
  coreBox: BoundingBox,
  tolerance: number = config.spellcraft.coreCenterToleranceRatio,
): boolean {
  const offset = Math.hypot(coreBox.centerX - circle.cx, coreBox.centerY - circle.cy);
  return offset <= circle.radius * tolerance;
}
