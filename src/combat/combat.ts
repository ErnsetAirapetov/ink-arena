import { CONFIG } from '../config';
import { absorbIncoming, type Status } from './status';

export interface Combatant {
  hp: number;
  maxHp: number;
  alive: boolean;
  statuses: Status[];
}

/** Создать бойца с полным HP. */
export function createCombatant(maxHp: number): Combatant {
  return { hp: maxHp, maxHp, alive: true, statuses: [] };
}

/** Применить плоский урон (без статусов). Возвращает нового бойца. */
export function applyDamage(c: Combatant, amount: number): Combatant {
  const hp = Math.max(0, Math.min(c.maxHp, c.hp - amount));
  return { ...c, hp, alive: hp > 0 };
}

/** Воскресить с полным HP и очищенными статусами. */
export function respawn(c: Combatant): Combatant {
  return { ...c, hp: c.maxHp, alive: true, statuses: [] };
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

/** Применить входящую атаку через статусы (щит со сродством). */
export function applyAttack(c: Combatant, raw: number, attackElement: string): Combatant {
  const { statuses, hpDamage } = absorbIncoming(c.statuses, raw, attackElement);
  const hp = Math.max(0, c.hp - hpDamage);
  return { ...c, hp, statuses, alive: hp > 0 };
}
