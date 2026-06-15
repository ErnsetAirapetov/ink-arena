import { CONFIG } from '../config';
import type { Spell } from '../spells/spell-system';

export interface Combatant {
  hp: number;
  maxHp: number;
  alive: boolean;
}

/** Создать бойца с полным HP. */
export function createCombatant(maxHp: number): Combatant {
  return { hp: maxHp, maxHp, alive: true };
}

/** Урон заклинания: зависит только от точности (power). */
export function damageFor(spell: Spell): number {
  return Math.round(spell.power * CONFIG.combat.damagePerPower);
}

/** Применить урон. Возвращает нового бойца, вход не мутирует. */
export function applyDamage(c: Combatant, amount: number): Combatant {
  const hp = Math.max(0, Math.min(c.maxHp, c.hp - amount));
  return { hp, maxHp: c.maxHp, alive: hp > 0 };
}

/** Воскресить с полным HP. */
export function respawn(c: Combatant): Combatant {
  return { hp: c.maxHp, maxHp: c.maxHp, alive: true };
}
