import type { Spell } from '../spells/spell-types';

export class Hud {
  private ink: HTMLElement;
  private msg: HTMLElement;

  constructor(private el: HTMLElement) {
    this.el.innerHTML = '<div id="hud-ink"></div><div id="hud-msg"></div>';
    this.ink = this.el.querySelector('#hud-ink')!;
    this.msg = this.el.querySelector('#hud-msg')!;
    this.msg.innerHTML =
      'Рисуй глифы, затем ПРОБЕЛ — каст. △ огонь · ~ вода · ⌇ воздух · □ земля · ⚡ молния · ○ щит. G — подсказка';
  }

  /** Персистентная шкала чернил, обновляется каждый кадр. */
  setInk(current: number, max: number): void {
    const pct = Math.max(0, Math.min(1, current / max));
    const width = Math.round(pct * 120);
    const color = pct < 0.2 ? '#ff5a36' : pct < 0.5 ? '#ffd23d' : '#3da5ff';
    this.ink.innerHTML =
      `Чернила ${Math.round(current)}/${max} ` +
      `<span style="display:inline-block;width:120px;height:8px;` +
      `background:#2a2e3a;border-radius:4px;vertical-align:middle;overflow:hidden">` +
      `<span style="display:block;width:${width}px;height:100%;background:${color}"></span></span>`;
  }

  showFizzle(reason: string): void {
    this.msg.innerHTML = `Осечка: ${reason}`;
  }

  /** Осечка сжигает потраченные чернила (Р29) — без стана. */
  showFizzleBurn(reason: string, burned: number): void {
    this.msg.innerHTML =
      `Осечка: ${reason} · <b style="color:#ff5a36">−${Math.round(burned)} чернил сожжено</b>`;
  }

  showNoInk(cost: number): void {
    this.msg.innerHTML = `Мало чернил: нужно ${Math.round(cost)}. Подожди регенерации.`;
  }

  showAttack(spell: Spell, sizeFactor: number, damage: number, flightMs: number): void {
    if (spell.kind !== 'attack' && spell.kind !== 'combo') return;
    const label = spell.kind === 'combo' ? 'КОМБО' : 'Заклинание';
    this.msg.innerHTML =
      `${label}: <b>${spell.name}</b> · размер ×${sizeFactor.toFixed(2)} · ` +
      `урон ${damage} · полёт ${(flightMs / 1000).toFixed(1)}с`;
  }

  showShield(element: string | null, durationMs: number): void {
    const suffix = element ? ` (${element})` : '';
    this.msg.innerHTML = `<b>Щит${suffix}</b> поднят · ${Math.round(durationMs / 1000)} с`;
  }
}
