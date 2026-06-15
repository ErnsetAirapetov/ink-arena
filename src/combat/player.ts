import { CONFIG } from '../config';
import { blockedDamage } from './combat';

export interface Player {
  hp: number;
  maxHp: number;
  alive: boolean;
  /** Остаток времени щита, мс (0 — щита нет). */
  shieldMs: number;
  /** Стихия активного щита (null — базовый щит или нет щита). */
  shieldElement: string | null;
}

export function createPlayer(maxHp: number = CONFIG.combat.playerHp): Player {
  return { hp: maxHp, maxHp, alive: true, shieldMs: 0, shieldElement: null };
}

export function castShield(p: Player, durationMs: number, element: string | null = null): Player {
  return { ...p, shieldMs: durationMs, shieldElement: element };
}

export function tickPlayer(p: Player, dtMs: number): Player {
  const shieldMs = Math.max(0, p.shieldMs - dtMs);
  return { ...p, shieldMs, shieldElement: shieldMs > 0 ? p.shieldElement : null };
}

export function isShielded(p: Player): boolean {
  return p.shieldMs > 0;
}

/** Применить входящую атаку: щит снижает урон (со сродством), HP падает. */
export function applyDamageToPlayer(p: Player, rawDamage: number, attackElement: string): Player {
  const dmg = isShielded(p)
    ? blockedDamage(p.shieldElement, rawDamage, attackElement)
    : Math.round(rawDamage);
  const hp = Math.max(0, p.hp - dmg);
  return { ...p, hp, alive: hp > 0 };
}

export function respawnPlayer(p: Player): Player {
  return { ...p, hp: p.maxHp, alive: true, shieldMs: 0, shieldElement: null };
}
