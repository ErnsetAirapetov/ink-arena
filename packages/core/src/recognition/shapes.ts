import type { Glyph } from './glyphs.js';
import type { Point, Stroke } from '../geometry/types.js';

// Идеальные формы глифов как чистые генераторы точек (формат эталонов:
// типизированные массивы точек, порождаемые кодом в .ts — без внешних
// ассетов, tree-shakeable, типобезопасно; обоснование — в PR). Координаты
// экранные: x вправо, y вниз, канонический бокс ≈ [0,1]×[0,1]. Абсолютный
// масштаб/сдвиг не важны — $P их нормализует.

// Равномерная выборка параметрической кривой f: [0,1] → точка, n сегментов.
function sample(n: number, f: (t: number) => Point): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) pts.push(f(i / n));
  return pts;
}

// Треугольник вершиной вверх (замкнут). 🔥
function triangle(): Stroke {
  return [
    { x: 0.5, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: 0.5, y: 0 },
  ];
}

// Квадрат (замкнут). ⛰
function square(): Stroke {
  return [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: 0, y: 0 },
  ];
}

// Горизонтальная волна, 2 гребня. 💧
function wave(): Stroke {
  return sample(48, (t) => ({ x: t, y: 0.5 - 0.5 * Math.sin(2 * Math.PI * 2 * t) }));
}

// Вертикальная S-серпантина, 1 период. 🌪
function sCurve(): Stroke {
  return sample(48, (t) => ({ x: 0.5 + 0.5 * Math.sin(2 * Math.PI * t), y: t }));
}

// Острый зигзаг (молния), 3 сегмента. ⚡
function zigzag(): Stroke {
  return [
    { x: 0, y: 0 },
    { x: 1, y: 0.33 },
    { x: 0, y: 0.66 },
    { x: 1, y: 1 },
  ];
}

// Одиночная дуга-арка, открыта вниз. ⌒
function arc(): Stroke {
  return sample(32, (t) => ({ x: t, y: 0.5 - 0.5 * Math.sin(Math.PI * t) }));
}

// Спираль внутрь, ~2 оборота. (хил)
function spiral(): Stroke {
  const turns = 2;
  return sample(64, (t) => {
    const r = 0.5 * (1 - 0.85 * t);
    const a = 2 * Math.PI * turns * t;
    return { x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a) };
  });
}

// Диагональ снизу-слева вверх-вправо. /
function slash(): Stroke {
  return [
    { x: 0, y: 1 },
    { x: 1, y: 0 },
  ];
}

// Диагональ сверху-слева вниз-вправо. \
function backslash(): Stroke {
  return [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ];
}

// Каноническая форма каждого глифа.
export const SHAPES: Readonly<Record<Glyph, () => Stroke>> = {
  fire: triangle,
  earth: square,
  water: wave,
  air: sCurve,
  lightning: zigzag,
  shield: arc,
  heal: spiral,
  buff: slash,
  debuff: backslash,
};

// Идеальный штрих глифа.
export function idealStroke(glyph: Glyph): Point[] {
  return SHAPES[glyph]().map((p) => ({ x: p.x, y: p.y }));
}
