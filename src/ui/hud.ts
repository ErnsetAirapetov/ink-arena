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
}
