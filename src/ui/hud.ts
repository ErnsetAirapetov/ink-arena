import type { CastOutcome } from '../spells/cast';

export class Hud {
  constructor(private el: HTMLElement) {
    this.el.innerHTML =
      'Рисуй глифы, затем ПРОБЕЛ — каст. △ огонь · ~ вода · ◠ воздух · □ земля · ⚡ молния · ○ щит';
  }

  showCast(outcome: CastOutcome): void {
    if (outcome.kind === 'fizzle') {
      this.el.innerHTML = `Осечка: ${outcome.reason}`;
      return;
    }
    const label = outcome.kind === 'combo' ? 'КОМБО' : 'Заклинание';
    this.el.innerHTML = `${label}: <b>${outcome.name}</b> · сила ${outcome.power}%`;
  }

  showAttack(
    outcome: CastOutcome,
    sizeFactor: number,
    damage: number,
    flightMs: number,
  ): void {
    if (outcome.kind === 'fizzle') return;
    const label = outcome.kind === 'combo' ? 'КОМБО' : 'Заклинание';
    this.el.innerHTML =
      `${label}: <b>${outcome.name}</b> · размер ×${sizeFactor.toFixed(2)} · ` +
      `урон ${damage} · полёт ${(flightMs / 1000).toFixed(1)}с`;
  }

  showShield(durationMs: number): void {
    this.el.innerHTML = `<b>Щит</b> поднят · ${Math.round(durationMs / 1000)} с`;
  }
}
