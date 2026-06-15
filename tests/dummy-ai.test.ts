import { describe, it, expect } from 'vitest';
import { createDummyAi, tickDummyAi, telegraphElement } from '../src/combat/dummy-ai';
import { CONFIG } from '../src/config';

describe('dummy-ai', () => {
  it('старт — телеграф первой стихии', () => {
    const ai = createDummyAi();
    expect(telegraphElement(ai)).toBe('fire');
  });

  it('телеграф не стреляет, пока идёт', () => {
    const ai = createDummyAi();
    const t = tickDummyAi(ai, 100);
    expect(t.fire).toBeNull();
    expect(telegraphElement(t.ai)).toBe('fire');
  });

  it('конец телеграфа → выстрел текущей стихией, фаза паузы', () => {
    const ai = createDummyAi();
    const t = tickDummyAi(ai, CONFIG.combat.telegraphMs);
    expect(t.fire).toEqual({ element: 'fire' });
    expect(telegraphElement(t.ai)).toBeNull(); // пауза
  });

  it('конец паузы → телеграф следующей стихии, без выстрела', () => {
    let ai = createDummyAi();
    ai = tickDummyAi(ai, CONFIG.combat.telegraphMs).ai; // → пауза
    const t = tickDummyAi(ai, CONFIG.combat.dummyAttackIntervalMs); // → след. телеграф
    expect(t.fire).toBeNull();
    expect(telegraphElement(t.ai)).toBe('air');
  });
});
