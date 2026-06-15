import type { Spell } from '../spells/spell-types';

export class Hud {
  constructor(private el: HTMLElement) {
    this.el.innerHTML =
      'Рисуй глифы, затем ПРОБЕЛ — каст. △ огонь · ~ вода · ⌇ воздух · □ земля · ⚡ молния · ○ щит. G — подсказка';
  }

  showFizzle(reason: string): void {
    this.el.innerHTML = `Осечка: ${reason}`;
  }

  showAttack(spell: Spell, sizeFactor: number, damage: number, flightMs: number): void {
    if (spell.kind !== 'attack' && spell.kind !== 'combo') return;
    const label = spell.kind === 'combo' ? 'КОМБО' : 'Заклинание';
    this.el.innerHTML =
      `${label}: <b>${spell.name}</b> · размер ×${sizeFactor.toFixed(2)} · ` +
      `урон ${damage} · полёт ${(flightMs / 1000).toFixed(1)}с`;
  }

  showShield(element: string | null, durationMs: number): void {
    const suffix = element ? ` (${element})` : '';
    this.el.innerHTML = `<b>Щит${suffix}</b> поднят · ${Math.round(durationMs / 1000)} с`;
  }
}
