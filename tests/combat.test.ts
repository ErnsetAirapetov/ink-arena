import { describe, it, expect } from 'vitest';
import {
  createCombatant,
  applyDamage,
  respawn,
  sizeFactor,
  damageFor,
  speedFactor,
  flightTimeMs,
} from '../src/combat/combat';

describe('combat — бойцы', () => {
  it('createCombatant — полный HP и жив', () => {
    expect(createCombatant(100)).toEqual({ hp: 100, maxHp: 100, alive: true });
  });

  it('applyDamage — обрезает HP по 0 и помечает мёртвым', () => {
    const c = applyDamage(createCombatant(50), 80);
    expect(c.hp).toBe(0);
    expect(c.alive).toBe(false);
  });

  it('applyDamage — не мутирует входной объект', () => {
    const orig = createCombatant(100);
    applyDamage(orig, 40);
    expect(orig.hp).toBe(100);
  });

  it('respawn — восстанавливает полный HP', () => {
    const dead = applyDamage(createCombatant(100), 200);
    expect(respawn(dead)).toEqual({ hp: 100, maxHp: 100, alive: true });
  });
});

describe('combat — размер/урон/скорость', () => {
  it('sizeFactor — эталон даёт 1.0', () => {
    expect(sizeFactor(200)).toBe(1);
  });

  it('sizeFactor — обрезает снизу и сверху', () => {
    expect(sizeFactor(50)).toBe(0.5); // 0.25 → clamp 0.5
    expect(sizeFactor(1000)).toBe(2); // 5.0 → clamp 2.0
  });

  it('damageFor — база × размер × точность', () => {
    expect(damageFor(1, 1)).toBe(50);
    expect(damageFor(1.5, 1)).toBe(75);
    expect(damageFor(1, 0.8)).toBe(40);
  });

  it('speedFactor — +50% размера = -50% скорости', () => {
    expect(speedFactor(1)).toBe(1);
    expect(speedFactor(1.5)).toBe(0.5);
  });

  it('speedFactor — не ниже нижней границы', () => {
    expect(speedFactor(2)).toBe(0.25); // 2 - 2 = 0 → clamp 0.25
  });

  it('flightTimeMs — эталон 1000 мс, крупное медленнее', () => {
    expect(flightTimeMs(1)).toBe(1000);
    expect(flightTimeMs(1.5)).toBe(2000);
  });
});
