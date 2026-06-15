import type { Point } from '../geometry';

export interface Glyph {
  id: string;
  /** Человекочитаемое имя элемента. */
  name: string;
  /** Точки-эталон (в произвольном масштабе; нормируются при распознавании). */
  points: Point[];
}

const p = (x: number, y: number): Point => ({ x, y, t: 0 });

/** Точки окружности радиуса r вокруг (cx, cy), n штук. */
function circle(cx: number, cy: number, r: number, n: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    pts.push(p(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  return pts;
}

export const GLYPHS: Glyph[] = [
  {
    id: 'fire',
    name: 'Огонь',
    // Треугольник △
    points: [p(50, 0), p(0, 100), p(100, 100), p(50, 0)],
  },
  {
    id: 'water',
    name: 'Вода',
    // Волна ~
    points: [p(0, 50), p(25, 0), p(50, 50), p(75, 100), p(100, 50)],
  },
  {
    id: 'shield',
    name: 'Щит',
    // Окружность ○
    points: circle(50, 50, 50, 16),
  },
  {
    id: 'arrow',
    name: 'Стрела',
    // Диагональ /
    points: [p(0, 100), p(50, 50), p(100, 0)],
  },
];
