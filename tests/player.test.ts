import { describe, it, expect } from 'vitest';
import { createPlayer, castShield, tickPlayer, isShielded } from '../src/combat/player';

describe('player — щит', () => {
  it('createPlayer — без щита', () => {
    const p = createPlayer();
    expect(p.shieldMs).toBe(0);
    expect(isShielded(p)).toBe(false);
  });

  it('castShield — ставит таймер щита', () => {
    const p = castShield(createPlayer(), 10000);
    expect(p.shieldMs).toBe(10000);
    expect(isShielded(p)).toBe(true);
  });

  it('tickPlayer — уменьшает таймер', () => {
    const p = tickPlayer({ shieldMs: 1000 }, 300);
    expect(p.shieldMs).toBe(700);
  });

  it('tickPlayer — не уходит ниже нуля', () => {
    const p = tickPlayer({ shieldMs: 200 }, 500);
    expect(p.shieldMs).toBe(0);
    expect(isShielded(p)).toBe(false);
  });

  it('castShield/tickPlayer не мутируют вход', () => {
    const orig = { shieldMs: 1000 };
    tickPlayer(orig, 300);
    expect(orig.shieldMs).toBe(1000);
  });
});
