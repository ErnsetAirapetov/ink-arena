import { CONFIG } from '../config';

/** Пул чернил игрока: расходуемый ресурс каста с регенерацией (Р3). */
export interface Ink {
  /** Текущий запас. */
  current: number;
  /** Максимум пула. */
  max: number;
}

/** Создать пул чернил, заполненный до максимума. */
export function createInk(max: number): Ink {
  return { current: max, max };
}

/** Стоимость каста: фиксированная база + плата за суммарную длину штрихов. */
export function inkCost(totalPathPx: number): number {
  return CONFIG.combat.ink.baseCost + CONFIG.combat.ink.costPerPx * totalPathPx;
}

/** Хватает ли чернил на указанную стоимость. */
export function canAfford(ink: Ink, cost: number): boolean {
  return ink.current >= cost;
}

/**
 * Списать стоимость (клампится в 0). Возвращает новый пул.
 * Используется и для траты при удачном касте, и для сжигания при осечке (Р29).
 */
export function spendInk(ink: Ink, cost: number): Ink {
  return { ...ink, current: Math.max(0, ink.current - cost) };
}

/** Регенерация за dtMs при ставке ratePerSec, не выше максимума. */
export function regenInk(ink: Ink, ratePerSec: number, dtMs: number): Ink {
  const next = Math.min(ink.max, ink.current + ratePerSec * (dtMs / 1000));
  return { ...ink, current: next };
}
