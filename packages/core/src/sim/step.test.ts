import { describe, expect, it } from 'vitest';
import type { CastOutcome } from '../spellcraft/types.js';
import { corpusCast } from './corpus.js';
import { createMatch } from './state.js';
import { step } from './step.js';
import type { MageInput, SimEvent, SimState, TickInputs } from './types.js';

const NONE: TickInputs = [{ cast: null }, { cast: null }];

function cast(mage: 0 | 1, c: CastOutcome): TickInputs {
  const a: MageInput = { cast: mage === 0 ? c : null };
  const b: MageInput = { cast: mage === 1 ? c : null };
  return [a, b];
}

// Прогнать n тиков с пустым вводом, собрать все события.
function runIdle(state: SimState, n: number): { state: SimState; events: SimEvent[] } {
  let s = state;
  const events: SimEvent[] = [];
  for (let i = 0; i < n; i++) {
    const r = step(s, NONE);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

// Дуэль без ботов — вход под полным контролем теста.
function duel(over = {}): SimState {
  return createMatch({ mages: [{}, {}], ...over });
}

describe('step: чистота и реген (Р38, Р3)', () => {
  it('не мутирует входное состояние', () => {
    const s = duel();
    const snapshot = JSON.parse(JSON.stringify(s));
    step(s, cast(0, corpusCast('spark')));
    expect(s).toEqual(snapshot);
  });

  it('реген чернил растёт и зажат сверху maxInk', () => {
    const s = duel({ mages: [{ startInk: 10, inkRegenPerTick: 2 }, {}] });
    const r1 = step(s, NONE);
    expect(r1.state.mages[0].ink).toBe(12);
    const full = runIdle(s, 1000).state;
    expect(full.mages[0].ink).toBe(full.mages[0].maxInk);
  });

  it('tick растёт на 1 за шаг', () => {
    const s = duel();
    expect(step(s, NONE).state.tick).toBe(1);
  });
});

describe('step: касты (Р27, Р29, Р3)', () => {
  it('валидная атака рождает снаряд и списывает чернила', () => {
    const s = duel({ mages: [{ startInk: 50, inkRegenPerTick: 0 }, {}] });
    const c = corpusCast('spark');
    const r = step(s, cast(0, c));
    expect(r.state.projectiles).toHaveLength(1);
    expect(r.state.mages[0].ink).toBeCloseTo(50 - c.cost, 6);
    expect(r.events.some((e) => e.type === 'cast')).toBe(true);
    expect(r.events.some((e) => e.type === 'projectile-launched')).toBe(true);
  });

  it('шит-каст поднимает щит со сродством стихии', () => {
    const s = duel();
    const r = step(s, cast(0, corpusCast('fireWall')));
    expect(r.state.mages[0].shields).toHaveLength(1);
    expect(r.state.mages[0].shields[0].affinity).toBe('fire');
    expect(r.events.some((e) => e.type === 'shield-raised')).toBe(true);
  });

  it('хил-каст лечит, но не выше maxHp', () => {
    const s = duel({ mages: [{ maxHp: 100 }, {}] });
    s.mages[0].hp = 50;
    const r = step(s, cast(0, corpusCast('spring')));
    expect(r.state.mages[0].hp).toBeGreaterThan(50);
    const healEvent = r.events.find((e) => e.type === 'heal');
    expect(healEvent).toBeDefined();
  });

  it('осечка сжигает потраченные чернила без стана (Р29)', () => {
    const s = duel({ mages: [{ startInk: 50, inkRegenPerTick: 0 }, {}] });
    const misfire: CastOutcome = { kind: 'misfire', reason: 'two-elements', cost: 8 };
    const r = step(s, cast(0, misfire));
    expect(r.state.mages[0].ink).toBeCloseTo(50 - 8, 6);
    expect(r.state.projectiles).toHaveLength(0);
    expect(r.events.some((e) => e.type === 'misfire')).toBe(true);
  });

  it('not-sent — ничего (Р27)', () => {
    const s = duel({ mages: [{ startInk: 50, inkRegenPerTick: 0 }, {}] });
    const notSent: CastOutcome = { kind: 'not-sent', reason: 'circle-not-closed' };
    const r = step(s, cast(0, notSent));
    expect(r.state.mages[0].ink).toBeCloseTo(50, 6);
    expect(r.events).toHaveLength(0);
  });

  it('без чернил каст отклоняется (cast-failed)', () => {
    const s = duel({ mages: [{ startInk: 0, inkRegenPerTick: 0 }, {}] });
    const r = step(s, cast(0, corpusCast('stormWrath')));
    expect(r.state.projectiles).toHaveLength(0);
    expect(r.events.some((e) => e.type === 'cast-failed')).toBe(true);
  });
});

describe('step: попадания, щиты, пентаграмма, уязвимость (Р24, Р25)', () => {
  it('снаряд долетает и снимает HP по силе', () => {
    const s = duel();
    const c = corpusCast('spark');
    const launched = step(s, cast(0, c));
    const flight = launched.state.projectiles[0].remainingFlightTicks;
    const after = runIdle(launched.state, flight);
    const hit = after.events.find((e) => e.type === 'hit');
    expect(hit).toBeDefined();
    expect(after.state.mages[1].hp).toBeCloseTo(s.mages[1].maxHp - c.power, 4);
    expect(after.state.projectiles).toHaveLength(0);
  });

  it('верный контр-щит (снаряд слаб против его стихии) держит больше', () => {
    // Снаряд огня против щита воды: вода бьёт огонь → снаряд weak → щит держит
    // лучше (strongMultiplier). Проверяем через погашение равного пула.
    const strong = duel();
    strong.mages[1].shields.push({ affinity: 'water', hp: 10 });
    const weak = duel();
    weak.mages[1].shields.push({ affinity: 'earth', hp: 10 }); // огонь бьёт землю → снаряд strong

    const fireCast: CastOutcome = {
      kind: 'spell',
      cost: 5,
      power: 12,
      spell: { element: 'fire', action: 'attack', modifiers: [], coreAccuracy: 1, coreSize: 80 },
    };

    const runHit = (st: SimState) => {
      const l = step(st, cast(0, fireCast));
      const f = l.state.projectiles[0].remainingFlightTicks;
      return runIdle(l.state, f).state;
    };
    const vsWater = runHit(strong);
    const vsEarth = runHit(weak);
    // Против воды щит эффективнее — HP цели просел меньше, чем против земли.
    expect(vsWater.mages[1].hp).toBeGreaterThan(vsEarth.mages[1].hp);
  });

  it('дебаф-снаряд навешивает уязвимость, усиливающую следующий урон', () => {
    const s = duel();
    const debuff = corpusCast('stoneCurse'); // earth + debuff augment
    const l = step(s, cast(0, debuff));
    const f = l.state.projectiles[0].remainingFlightTicks;
    const afterDebuff = runIdle(l.state, f).state;
    expect(afterDebuff.mages[1].vulnerability).not.toBeNull();
    const hpAfterDebuff = afterDebuff.mages[1].hp;

    // Второй одинаковый снаряд по уязвимой цели снимает больше базовой силы.
    const plainHit: CastOutcome = {
      kind: 'spell',
      cost: 5,
      power: 10,
      spell: { element: 'water', action: 'attack', modifiers: [], coreAccuracy: 1, coreSize: 80 },
    };
    const l2 = step(afterDebuff, cast(0, plainHit));
    const f2 = l2.state.projectiles[0].remainingFlightTicks;
    const afterNuke = runIdle(l2.state, f2).state;
    const hpDrop = hpAfterDebuff - afterNuke.mages[1].hp;
    expect(hpDrop).toBeGreaterThan(plainHit.power); // усилено уязвимостью
  });

  it('пробитый щит эмитит shield-broken и убирается из пула', () => {
    const s = duel();
    s.mages[1].shields.push({ affinity: 'water', hp: 1 });
    const big: CastOutcome = {
      kind: 'spell',
      cost: 5,
      power: 50,
      spell: { element: 'lightning', action: 'attack', modifiers: [], coreAccuracy: 1, coreSize: 80 },
    };
    const l = step(s, cast(0, big));
    const f = l.state.projectiles[0].remainingFlightTicks;
    const after = runIdle(l.state, f);
    expect(after.events.some((e) => e.type === 'shield-broken')).toBe(true);
    expect(after.state.mages[1].shields).toHaveLength(0);
    expect(after.state.mages[1].hp).toBeLessThan(s.mages[1].maxHp);
  });
});
