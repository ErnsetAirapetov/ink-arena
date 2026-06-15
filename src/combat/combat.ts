import { CONFIG } from '../config';

export interface Combatant {
  hp: number;
  maxHp: number;
  alive: boolean;
}

/** Создать бойца с полным HP. */
export function createCombatant(maxHp: number): Combatant {
  return { hp: maxHp, maxHp, alive: true };
}

/** Урон каста: зависит только от точности (power 0..100). */
export function damageFor(power: number): number {
  return Math.round(power * CONFIG.combat.damagePerPower);
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
