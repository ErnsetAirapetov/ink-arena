import { describe, it, expect } from 'vitest';
import {
  createPlayer,
  castShield,
  tickPlayer,
  isShielded,
  applyDamageToPlayer,
  respawnPlayer,
} from '../src/combat/player';

describe('player — HP и щит', () => {
  it('createPlayer — полный HP, без щита', () => {
    const p = createPlayer(100);
    expect(p.hp).toBe(100);
    expect(p.maxHp).toBe(100);
    expect(p.alive).toBe(true);
    expect(isShielded(p)).toBe(false);
  });

  it('castShield — ставит таймер и стихию щита', () => {
    const p = castShield(createPlayer(100), 10000, 'water');
    expect(p.shieldMs).toBe(10000);
    expect(p.shieldElement).toBe('water');
    expect(isShielded(p)).toBe(true);
  });

  it('tickPlayer — уменьшает таймер и снимает стихию при истечении', () => {
    const p = tickPlayer(castShield(createPlayer(100), 200, 'fire'), 500);
    expect(p.shieldMs).toBe(0);
    expect(p.shieldElement).toBeNull();
    expect(isShielded(p)).toBe(false);
  });

  it('applyDamageToPlayer — без щита полный урон', () => {
    const p = applyDamageToPlayer(createPlayer(100), 30, 'fire');
    expect(p.hp).toBe(70);
  });

  it('applyDamageToPlayer — щит снижает урон', () => {
    const shielded = castShield(createPlayer(100), 10000, null);
    const p = applyDamageToPlayer(shielded, 100, 'fire'); // базовый блок 0.6 → 40
    expect(p.hp).toBe(60);
  });

  it('applyDamageToPlayer — смерть при 0 HP', () => {
    const p = applyDamageToPlayer(createPlayer(20), 50, 'fire');
    expect(p.hp).toBe(0);
    expect(p.alive).toBe(false);
  });

  it('respawnPlayer — полный HP, щит снят', () => {
    const dead = applyDamageToPlayer(createPlayer(20), 50, 'fire');
    const p = respawnPlayer(dead);
    expect(p.hp).toBe(20);
    expect(p.alive).toBe(true);
    expect(p.shieldMs).toBe(0);
  });

  it('не мутирует вход', () => {
    const orig = createPlayer(100);
    applyDamageToPlayer(orig, 40, 'fire');
    expect(orig.hp).toBe(100);
  });
});
