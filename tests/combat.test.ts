import { describe, it, expect } from 'vitest';
import { createCombatant, damageFor, applyDamage, respawn } from '../src/combat/combat';
import type { Spell } from '../src/spells/spell-system';

const spell = (power: number): Spell => ({
  elementId: 'fire',
  element: 'Огонь',
  power,
  speed: 'normal',
  success: true,
});

describe('combat', () => {
  it('createCombatant — полный HP и жив', () => {
    expect(createCombatant(100)).toEqual({ hp: 100, maxHp: 100, alive: true });
  });

  it('damageFor — урон зависит от точности (power × 0.6)', () => {
    expect(damageFor(spell(100))).toBe(60);
    expect(damageFor(spell(50))).toBe(30);
  });

  it('applyDamage — снимает HP, остаётся жив', () => {
    const c = applyDamage(createCombatant(100), 30);
    expect(c.hp).toBe(70);
    expect(c.alive).toBe(true);
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
