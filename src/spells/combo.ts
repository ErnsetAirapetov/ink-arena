export interface Combo {
  id: string;
  name: string;
  /** Пара id глифов (порядок при поиске не важен). */
  parts: [string, string];
}

export const COMBOS: Combo[] = [
  { id: 'firestorm', name: 'Огненный вихрь', parts: ['fire', 'air'] },
  { id: 'storm', name: 'Шторм', parts: ['water', 'lightning'] },
  { id: 'magma', name: 'Магма', parts: ['earth', 'fire'] },
];

/** Ищет комбо по двум id глифов в любом порядке. */
export function findCombo(a: string, b: string): Combo | null {
  return (
    COMBOS.find(
      (c) =>
        (c.parts[0] === a && c.parts[1] === b) ||
        (c.parts[0] === b && c.parts[1] === a),
    ) ?? null
  );
}
