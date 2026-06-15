import { describe, it, expect } from 'vitest';
import {
  addShield,
  tickStatuses,
  absorbIncoming,
  shieldInfo,
  hasShield,
  type Status,
} from '../src/combat/status';

describe('status — щит', () => {
  it('addShield — новый щит', () => {
    const s = addShield([], 'water', 40, 10000);
    const sh = shieldInfo(s)!;
    expect(sh.element).toBe('water');
    expect(sh.absorb).toBe(40);
    expect(sh.durationMs).toBe(10000);
  });

  it('addShield — стак суммирует прочность и время, стихия последняя', () => {
    let s = addShield([], 'water', 40, 10000);
    s = addShield(s, 'fire', 40, 10000);
    const sh = shieldInfo(s)!;
    expect(sh.absorb).toBe(80);
    expect(sh.durationMs).toBe(20000);
    expect(sh.element).toBe('fire');
    expect(hasShield(s)).toBe(true);
  });

  it('addShield — стак не превышает кэпы', () => {
    let s: Status[] = [];
    for (let i = 0; i < 5; i++) s = addShield(s, null, 40, 10000);
    const sh = shieldInfo(s)!;
    expect(sh.absorb).toBe(120); // maxShieldAbsorb
    expect(sh.durationMs).toBe(30000); // maxShieldMs
  });

  it('tickStatuses — истёкший щит спадает', () => {
    const s = tickStatuses(addShield([], null, 40, 200), 500);
    expect(hasShield(s)).toBe(false);
  });

  it('tickStatuses — уменьшает время', () => {
    const s = tickStatuses(addShield([], null, 40, 1000), 300);
    expect(shieldInfo(s)!.durationMs).toBe(700);
  });

  it('absorbIncoming — без щита полный урон', () => {
    const r = absorbIncoming([], 30, 'fire');
    expect(r.hpDamage).toBe(30);
  });

  it('absorbIncoming — базовый щит гасит из пула, перелив по HP, щит спадает при опустошении', () => {
    const r = absorbIncoming(addShield([], null, 40, 10000), 100, 'fire');
    expect(r.hpDamage).toBe(60); // 100 - 40
    expect(hasShield(r.statuses)).toBe(false); // пул опустел
  });

  it('absorbIncoming — стихийный щит силён против атаки тратит пул меньше', () => {
    // щит fire против air (fire бьёт air, ×1.5): входящее 30/1.5=20, пул 100→80
    const r = absorbIncoming(addShield([], 'fire', 100, 10000), 30, 'air');
    expect(r.hpDamage).toBe(0);
    expect(shieldInfo(r.statuses)!.absorb).toBe(80);
  });
});
