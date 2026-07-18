import type { Point, Stroke } from '../../geometry/types.js';
import type { Glyph } from '../glyphs.js';
import { idealStroke } from '../shapes.js';
import { rotate, scale, translate } from './distort.js';

// Golden-корпус Р32: пять стартовых заклинаний как последовательности
// глифов-штрихов. Абсолютные размеры/позиции условны (ядро крупнее
// модификаторов по правилу Р26 п.2) — распознавание к ним инвариантно,
// корпус проверяет именно это. Композицию (ядро/орбиты, круг) разбирает
// spellcraft (#37), здесь только пер-глифное распознавание.

export interface GoldenGlyph {
  readonly glyph: Glyph;
  readonly stroke: Stroke;
}

export interface GoldenSpell {
  readonly name: string;
  readonly glyphs: readonly GoldenGlyph[];
}

// Разместить идеальный глиф: масштаб `size`, поворот `deg`, центр в (cx,cy).
function place(glyph: Glyph, size: number, cx: number, cy: number, deg = 0): Point[] {
  let s: Point[] = scale(idealStroke(glyph), size);
  if (deg !== 0) s = rotate(s, (deg * Math.PI) / 180);
  // Центрируем на (cx,cy): сдвигаем так, чтобы середина bbox [0..size] легла в центр.
  return translate(s, cx - size / 2, cy - size / 2);
}

export const GOLDEN_CORPUS: readonly GoldenSpell[] = [
  {
    // 1. Искра — маленькая ⚡, ядро без глаголов.
    name: 'Искра',
    glyphs: [{ glyph: 'lightning', stroke: place('lightning', 90, 400, 300) }],
  },
  {
    // 2. Огненная стена — ⌒ (щит) + 🔥.
    name: 'Огненная стена',
    glyphs: [
      { glyph: 'fire', stroke: place('fire', 200, 400, 320) },
      { glyph: 'shield', stroke: place('shield', 110, 400, 190) },
    ],
  },
  {
    // 3. Родник — спираль (хил) + 💧.
    name: 'Родник',
    glyphs: [
      { glyph: 'water', stroke: place('water', 210, 400, 300) },
      { glyph: 'heal', stroke: place('heal', 100, 560, 300) },
    ],
  },
  {
    // 4. Проклятие камня — \ (дебаф) + ⛰.
    name: 'Проклятие камня',
    glyphs: [
      { glyph: 'earth', stroke: place('earth', 200, 400, 300) },
      { glyph: 'debuff', stroke: place('debuff', 100, 560, 180) },
    ],
  },
  {
    // 5. Гнев бури — большая ⚡ + два / (баф).
    name: 'Гнев бури',
    glyphs: [
      { glyph: 'lightning', stroke: place('lightning', 320, 400, 300) },
      { glyph: 'buff', stroke: place('buff', 120, 620, 200) },
      { glyph: 'buff', stroke: place('buff', 120, 620, 400) },
    ],
  },
];

// Замыкающий круг, охватывающий композицию заклинания (Р27) — для проверки
// детекции круга на «настоящем» размахе.
export function enclosingCircle(cx: number, cy: number, r: number, n = 48): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (2 * Math.PI * i) / n;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}
