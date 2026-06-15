import { CONFIG } from '../config';

export const ELEMENTS = ['fire', 'air', 'earth', 'lightning', 'water'] as const;
export type Element = (typeof ELEMENTS)[number];

/** Кого бьёт каждая стихия (×strongMult). Обратное направление — ×weakMult. */
const BEATS: Record<Element, [Element, Element]> = {
  fire: ['air', 'earth'],
  air: ['earth', 'lightning'],
  earth: ['lightning', 'water'],
  lightning: ['water', 'fire'],
  water: ['fire', 'air'],
};

function isElement(id: string): id is Element {
  return (ELEMENTS as readonly string[]).includes(id);
}

/**
 * Множитель сродства атакующей стихии против защищающейся.
 * Совпадение или неизвестная стихия (например, модификатор) → 1.0.
 */
export function affinity(attacker: string, defender: string): number {
  if (!isElement(attacker) || !isElement(defender)) return 1;
  if (attacker === defender) return 1;
  return BEATS[attacker].includes(defender)
    ? CONFIG.affinity.strongMult
    : CONFIG.affinity.weakMult;
}
