import { config } from '../config.js';
import type { Spell } from './types.js';

// f(размер) — трейд-офф размера (Р4, Р30): монотонно возрастающая степенная
// кривая от диагонали ядра к опорному размеру refDiagonal, зажатая в
// [min, max]. Маленькое заклинание слабее бьёт, большое — сильнее. Конкретная
// форма (exponent/границы) — открытый параметр баланса (Р36), все числа — в
// config.spellcraft.power.size.
export function sizeFactor(coreDiagonal: number): number {
  const cfg = config.spellcraft.power.size;
  if (coreDiagonal <= 0) return cfg.min;
  const raw = Math.pow(coreDiagonal / cfg.refDiagonal, cfg.exponent);
  return Math.min(cfg.max, Math.max(cfg.min, raw));
}

// База магнитуды композиции (Р4: «что нарисовано»): собственная сила стихии
// ядра плюс вклад каждого глагола, взвешенный его относительным размером
// (Р26 п.5). Пентаграмма контрпика сюда не входит — это забота sim (#38).
export function compositionBase(spell: Spell): number {
  const cfg = config.spellcraft.power;
  let base = cfg.elementBase[spell.element];
  for (const m of spell.modifiers) {
    base += cfg.verbBase[m.verb] * m.weight;
  }
  return base;
}

// Точность руки на заклинании (Р4): взвешенное среднее точностей глифов, где
// ядро весит 1, а каждый модификатор — своим относительным размером. Ровнее
// легли линии — выше множитель силы.
export function castAccuracy(spell: Spell): number {
  let num = spell.coreAccuracy;
  let den = 1;
  for (const m of spell.modifiers) {
    num += m.accuracy * m.weight;
    den += m.weight;
  }
  return num / den;
}

// Формула силы (Р4, Р30): сила = база(композиция) × точность × f(размер).
// Скорость рисования в формулу не входит (Р30).
export function spellPower(spell: Spell): number {
  return compositionBase(spell) * castAccuracy(spell) * sizeFactor(spell.coreSize);
}
