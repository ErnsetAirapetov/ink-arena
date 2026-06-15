import { CONFIG } from '../config';
import { affinity } from './elements';

export interface Combatant {
  hp: number;
  maxHp: number;
  alive: boolean;
}

/** Создать бойца с полным HP. */
export function createCombatant(maxHp: number): Combatant {
  return { hp: maxHp, maxHp, alive: true };
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

/** Множитель размера: размер каста относительно эталона, обрезан по границам. */
export function sizeFactor(spellSizePx: number): number {
  const f = spellSizePx / CONFIG.combat.referenceSizePx;
  return Math.max(CONFIG.combat.minSizeFactor, Math.min(CONFIG.combat.maxSizeFactor, f));
}

/** Урон: база × размер × точность (0..1). */
export function damageFor(sizeFactor: number, accuracy: number): number {
  return Math.round(CONFIG.combat.baseDamage * sizeFactor * accuracy);
}

/** Множитель скорости: +X% размера = -X% скорости, не ниже нижней границы. */
export function speedFactor(sizeFactor: number): number {
  return Math.max(CONFIG.combat.minSpeedFactor, 2 - sizeFactor);
}

/** Время полёта снаряда: эталонное время / множитель скорости. */
export function flightTimeMs(sizeFactor: number): number {
  return CONFIG.combat.referenceFlightMs / speedFactor(sizeFactor);
}

/**
 * Финальный урон по цели с активным щитом стихии shieldElement (null — базовый).
 * Стихийный щит учитывает сродство против стихии атаки.
 */
export function blockedDamage(
  shieldElement: string | null,
  rawDamage: number,
  attackElement: string,
): number {
  const mult = shieldElement ? affinity(shieldElement, attackElement) : 1;
  const blockFraction = Math.max(
    0,
    Math.min(CONFIG.combat.maxBlockFraction, CONFIG.combat.shieldBlock * mult),
  );
  return Math.round(rawDamage * (1 - blockFraction));
}
