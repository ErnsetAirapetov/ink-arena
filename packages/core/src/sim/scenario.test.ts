import { describe, expect, it } from 'vitest';
import type { CastOutcome } from '../spellcraft/types.js';
import { corpusCast } from './corpus.js';
import { createMatch } from './state.js';
import { step } from './step.js';
import type { MageIndex, SimEvent, SimState, TickInputs } from './types.js';

const NONE: TickInputs = [{ cast: null }, { cast: null }];

function cast0(c: CastOutcome): TickInputs {
  return [{ cast: c }, { cast: null }];
}

// Летальный снаряд молнии (быстрый, без сродства щита у цели).
const LETHAL: CastOutcome = {
  kind: 'spell',
  cost: 5,
  power: 50,
  spell: { element: 'lightning', action: 'attack', modifiers: [], coreAccuracy: 1, coreSize: 80 },
};

// Прогнать до первого события заданного типа (или исчерпать лимит тиков).
function runUntil(
  state: SimState,
  inputsFor: (s: SimState) => TickInputs,
  predicate: (e: SimEvent) => boolean,
  maxTicks: number,
): { state: SimState; events: SimEvent[]; found: SimEvent | null } {
  let s = state;
  const events: SimEvent[] = [];
  for (let i = 0; i < maxTicks; i++) {
    const r = step(s, inputsFor(s));
    s = r.state;
    events.push(...r.events);
    const found = r.events.find(predicate);
    if (found) return { state: s, events, found };
  }
  return { state: s, events, found: null };
}

describe('сценарий: победа нокаутом (Р41)', () => {
  it('снаряд добивает HP до нуля — раунд взят, очко победителю', () => {
    const s = createMatch({ mages: [{}, { maxHp: 5 }], rules: { roundDurationTicks: 100000 } });
    let castOnce = false;
    const res = runUntil(
      s,
      () => (castOnce ? NONE : ((castOnce = true), cast0(LETHAL))),
      (e) => e.type === 'round-end',
      500,
    );
    expect(res.found).toMatchObject({ type: 'round-end', winner: 0, reason: 'knockout' });
    expect(res.state.match.wins).toEqual([1, 0]);
    expect(res.state.mages[1].hp).toBe(0);
  });
});

describe('сценарий: победа по остатку HP на исходе времени (Р41)', () => {
  it('оба живы, время истекло — берёт больший остаток HP', () => {
    const s = createMatch({ mages: [{}, {}], rules: { roundDurationTicks: 60 } });
    // Один укол по магу 1 — у него меньше HP к таймауту.
    let done = false;
    const res = runUntil(
      s,
      () => (done ? NONE : ((done = true), cast0(corpusCast('spark')))),
      (e) => e.type === 'round-end',
      500,
    );
    expect(res.found).toMatchObject({ type: 'round-end', winner: 0, reason: 'timeout-hp' });
    expect(res.state.mages[0].hp).toBeGreaterThan(res.state.mages[1].hp);
  });
});

describe('сценарий: внезапная смерть при равном HP (Р41)', () => {
  it('равный HP на исходе времени → sudden-death, чистый удар решает', () => {
    const s = createMatch({
      mages: [{}, {}],
      rules: { roundDurationTicks: 30, suddenDeathMaxTicks: 100000 },
    });
    // Никто не бьёт до таймаута → равный HP → внезапная смерть.
    const toSd = runUntil(s, () => NONE, (e) => e.type === 'sudden-death', 200);
    expect(toSd.found).toBeDefined();
    expect(toSd.state.round.phase).toBe('sudden-death');

    // В добое маг 0 наносит чистый удар — раунд решается в его пользу.
    let struck = false;
    const res = runUntil(
      toSd.state,
      () => (struck ? NONE : ((struck = true), cast0(corpusCast('spark')))),
      (e) => e.type === 'round-end',
      500,
    );
    expect(res.found).toMatchObject({ type: 'round-end', winner: 0, reason: 'sudden-death' });
  });

  it('добой без чистого удара упирается в кап — решает seeded RNG', () => {
    const s = createMatch({
      mages: [{}, {}],
      rules: { roundDurationTicks: 10, suddenDeathMaxTicks: 20 },
    });
    const res = runUntil(s, () => NONE, (e) => e.type === 'round-end', 500);
    expect(res.found).toMatchObject({ type: 'round-end', reason: 'sudden-death-rng' });
    expect([0, 1]).toContain((res.found as { winner: MageIndex }).winner);
  });
});

describe('сценарий: обоюдный КО в один тик — ничья (Р41)', () => {
  it('оба HP→0 в один тик: очко никому, счёт без изменений', () => {
    const s = createMatch({ mages: [{ maxHp: 5 }, { maxHp: 5 }], rules: { roundDurationTicks: 100000 } });
    // Оба кастуют идентичный летальный снаряд в тик 0 → одинаковый полёт →
    // попадания в один тик.
    const both: TickInputs = [{ cast: LETHAL }, { cast: LETHAL }];
    let fired = false;
    const res = runUntil(
      s,
      () => (fired ? NONE : ((fired = true), both)),
      (e) => e.type === 'round-end',
      500,
    );
    expect(res.found).toMatchObject({ type: 'round-end', winner: null, reason: 'mutual-ko' });
    expect(res.state.match.wins).toEqual([0, 0]);
    expect(res.state.match.roundsCompleted).toBe(1);
  });
});

describe('сценарий: разрешение матча bo3 (Р22)', () => {
  it('маг 0 берёт два раунда нокаутом — матч завершён 2:0', () => {
    let s = createMatch({
      mages: [{}, { maxHp: 5 }],
      rules: { roundDurationTicks: 100000, intermissionTicks: 3, winsNeeded: 2 },
    });
    const castedInRound = new Set<number>();
    const events: SimEvent[] = [];
    for (let i = 0; i < 5000 && !s.match.over; i++) {
      let inputs: TickInputs = NONE;
      if (s.round.phase === 'active' && !castedInRound.has(s.round.index)) {
        castedInRound.add(s.round.index);
        inputs = cast0(LETHAL);
      }
      const r = step(s, inputs);
      s = r.state;
      events.push(...r.events);
    }
    expect(s.match.over).toBe(true);
    expect(s.match.winner).toBe(0);
    expect(s.match.wins).toEqual([2, 0]);
    expect(events.some((e) => e.type === 'match-end')).toBe(true);
    // Между раундами был «чистый лист» — round-start второго раунда.
    expect(events.some((e) => e.type === 'round-start' && e.round === 1)).toBe(true);
  });

  it('между раундами HP/чернила сброшены, счёт матча перенесён (Р28)', () => {
    let s = createMatch({
      mages: [{}, { maxHp: 5 }],
      rules: { roundDurationTicks: 100000, intermissionTicks: 2, winsNeeded: 3 },
    });
    // Доводим до старта второго раунда.
    const castedInRound = new Set<number>();
    for (let i = 0; i < 3000; i++) {
      if (s.round.index >= 1 && s.round.phase === 'active') break;
      let inputs: TickInputs = NONE;
      if (s.round.phase === 'active' && !castedInRound.has(s.round.index)) {
        castedInRound.add(s.round.index);
        inputs = cast0(LETHAL);
      }
      s = step(s, inputs).state;
    }
    expect(s.round.index).toBe(1);
    // Чистый лист: полные HP/чернила у обоих.
    expect(s.mages[0].hp).toBe(s.mages[0].maxHp);
    expect(s.mages[1].hp).toBe(s.mages[1].maxHp);
    expect(s.mages[0].ink).toBe(s.mages[0].maxInk);
    // Счёт матча перенесён.
    expect(s.match.wins).toEqual([1, 0]);
  });
});

describe('сценарий: полный раунд ПвЕ с ботом-манекеном (Р32)', () => {
  it('бот кастует по расписанию, раунд разрешается', () => {
    const s = createMatch({ rules: { roundDurationTicks: 600 } });
    const res = runUntil(s, () => NONE, (e) => e.type === 'round-end', 3000);
    expect(res.found).toBeDefined();
    // Бот (маг 1) кастовал хотя бы раз.
    expect(res.events.some((e) => e.type === 'cast' && e.mage === 1)).toBe(true);
    // HP игрока не вышел за границы.
    expect(res.state.mages[0].hp).toBeGreaterThanOrEqual(0);
  });
});

describe('сценарий: состав событий типового каста', () => {
  it('атака даёт cast + projectile-launched в тик каста и hit в тик попадания', () => {
    const s = createMatch({ mages: [{}, {}], rules: { roundDurationTicks: 100000 } });
    const c = corpusCast('spark');
    const launch = step(s, cast0(c));
    const castEv = launch.events.find((e) => e.type === 'cast');
    const projEv = launch.events.find((e) => e.type === 'projectile-launched');
    expect(castEv).toMatchObject({ type: 'cast', mage: 0, element: 'lightning', action: 'attack' });
    expect(projEv).toMatchObject({ type: 'projectile-launched', mage: 0 });
    const flight = launch.state.projectiles[0].remainingFlightTicks;

    const res = runUntil(launch.state, () => NONE, (e) => e.type === 'hit', flight + 2);
    expect(res.found).toMatchObject({ type: 'hit', mage: 1, element: 'lightning' });
  });
});
