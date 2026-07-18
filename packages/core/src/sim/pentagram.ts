import type { Element } from '../recognition/glyphs.js';

// Пентаграмма контрпиков стихий (Р24, spellcraft.md#пять-стихий). Каждая
// стихия сильна против двух и слаба против двух — это СТРУКТУРА игры (состав
// фиксирован, Р24), поэтому таблица живёт здесь, рядом со словарём глифов, а
// не в config (там только числа-множители силы контрпика).
//
//   🔥 Огонь    бьёт воздух, землю
//   💧 Вода     бьёт огонь, воздух
//   🌪 Воздух   бьёт землю, молнию
//   ⛰ Земля    бьёт молнию, воду
//   ⚡ Молния   бьёт воду, огонь
export const BEATS: Readonly<Record<Element, readonly Element[]>> = {
  fire: ['air', 'earth'],
  water: ['fire', 'air'],
  air: ['earth', 'lightning'],
  earth: ['lightning', 'water'],
  lightning: ['water', 'fire'],
};

// Исход стихийного матчапа снаряда против стихии-защитника (щита).
export type Matchup = 'strong' | 'weak' | 'neutral';

// Матчап стихии атакующего снаряда против стихии защитника:
//   'strong'  — атакующий бьёт защитника (контрпик в пользу атаки);
//   'weak'    — защитник бьёт атакующего (верный контр-щит);
//   'neutral' — ни то ни другое (в т.ч. одинаковые стихии).
export function elementMatchup(attacker: Element, defender: Element): Matchup {
  if (BEATS[attacker].includes(defender)) return 'strong';
  if (BEATS[defender].includes(attacker)) return 'weak';
  return 'neutral';
}
