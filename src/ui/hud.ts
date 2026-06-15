import type { Spell } from '../spells/spell-system';

export class Hud {
  constructor(private el: HTMLElement) {
    this.el.innerHTML = 'Нарисуй глиф: △ огонь · ~ вода · ○ щит · / стрела';
  }

  showSpell(spell: Spell): void {
    if (!spell.success) {
      this.el.innerHTML = `Заклинание рассеялось (точность ${spell.power}%) — рисуй точнее`;
      return;
    }
    this.el.innerHTML =
      `<b>${spell.element}</b> · точность ${spell.power}% · скорость ${this.ru(spell.speed)}`;
  }

  showCombo(name: string, power: number): void {
    this.el.innerHTML = `КОМБО: <b>${name}</b> · сила ${power}%`;
  }

  private ru(speed: string): string {
    return { fast: 'быстро', normal: 'обычно', slow: 'медленно' }[speed] ?? speed;
  }
}
