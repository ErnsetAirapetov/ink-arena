import { CONFIG } from '../config';

export interface Combo {
  id: string;
  name: string;
  /** Упорядоченная пара id глифов. */
  parts: [string, string];
}

export const COMBOS: Combo[] = [
  { id: 'fireball', name: 'Огнешар', parts: ['fire', 'arrow'] },
  { id: 'healing-barrier', name: 'Лечащий барьер', parts: ['water', 'shield'] },
];

export type ComboResult =
  | { type: 'single'; elementId: string }
  | { type: 'combo'; combo: Combo };

export class ComboTracker {
  private lastId: string | null = null;
  private lastTime = 0;

  push(elementId: string, timeMs: number): ComboResult {
    if (this.lastId !== null && timeMs - this.lastTime <= CONFIG.comboWindowMs) {
      const combo = COMBOS.find(
        (c) => c.parts[0] === this.lastId && c.parts[1] === elementId,
      );
      if (combo) {
        this.reset();
        return { type: 'combo', combo };
      }
    }
    this.lastId = elementId;
    this.lastTime = timeMs;
    return { type: 'single', elementId };
  }

  private reset(): void {
    this.lastId = null;
    this.lastTime = 0;
  }
}
