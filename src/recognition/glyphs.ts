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
    // Треугольник △ вершиной вверх
    points: [p(50, 0), p(0, 100), p(100, 100), p(50, 0)],
  },
  {
    id: 'water',
    name: 'Вода',
    // Волна ~ (две дуги)
    points: [p(0, 50), p(20, 10), p(40, 50), p(60, 90), p(80, 50), p(100, 10)],
  },
  {
    id: 'air',
    name: 'Воздух',
    // Вертикальная волна ⌇ (горизонтальная волна, повёрнутая на 90°)
    points: [p(50, 0), p(90, 20), p(50, 40), p(10, 60), p(50, 80), p(90, 100)],
  },
  {
    id: 'earth',
    name: 'Земля',
    // Квадрат □
    points: [p(0, 0), p(100, 0), p(100, 100), p(0, 100), p(0, 0)],
  },
  {
    id: 'lightning',
    name: 'Молния',
    // Зигзаг ⚡
    points: [p(55, 0), p(20, 40), p(45, 40), p(15, 100)],
  },
  {
    id: 'shield',
    name: 'Щит',
    // Круг ○
    points: circle(50, 50, 50, 16),
  },
];
