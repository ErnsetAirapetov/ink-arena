export interface Player {
  /** Остаток времени статуса «щит», мс (0 — щита нет). */
  shieldMs: number;
}

/** Игрок без активного щита. */
export function createPlayer(): Player {
  return { shieldMs: 0 };
}

/** Поднять щит на durationMs (текущее состояние игнорируется — щит обновляется). */
export function castShield(_p: Player, durationMs: number): Player {
  return { shieldMs: durationMs };
}

/** Уменьшить таймер щита на dtMs (не ниже 0). Вход не мутирует. */
export function tickPlayer(p: Player, dtMs: number): Player {
  return { shieldMs: Math.max(0, p.shieldMs - dtMs) };
}

/** Активен ли щит. */
export function isShielded(p: Player): boolean {
  return p.shieldMs > 0;
}
