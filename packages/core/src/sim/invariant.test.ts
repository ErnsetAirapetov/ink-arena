import { describe, expect, it } from 'vitest';
import type { CastOutcome } from '../spellcraft/types.js';
import { corpusCast } from './corpus.js';
import { createMatch } from './state.js';
import { step } from './step.js';
import type { SimState, TickInputs } from './types.js';

const NONE: TickInputs = [{ cast: null }, { cast: null }];

// Дуэль бот-против-бота — плотная активность для инвариантов.
function botDuel(over = {}): SimState {
  return createMatch({ mages: [{ bot: {} }, { bot: {} }], ...over });
}

describe('инвариант: HP не растёт от урона', () => {
  it('в раунде без хила HP каждого мага только не растёт', () => {
    // Ротации ботов по умолчанию без хила → в пределах раунда HP лишь падает.
    let s = botDuel({ rules: { roundDurationTicks: 100000 } });
    let prev: [number, number] = [s.mages[0].hp, s.mages[1].hp];
    for (let i = 0; i < 2000; i++) {
      const r = step(s, NONE);
      s = r.state;
      if (r.events.some((e) => e.type === 'round-end')) break;
      expect(s.mages[0].hp).toBeLessThanOrEqual(prev[0]);
      expect(s.mages[1].hp).toBeLessThanOrEqual(prev[1]);
      prev = [s.mages[0].hp, s.mages[1].hp];
    }
  });
});

describe('инвариант: чернила всегда в [0, maxInk]', () => {
  it('за длинный прогон бот-против-бота чернила не выходят за границы', () => {
    let s = botDuel({ rules: { roundDurationTicks: 300, intermissionTicks: 20 } });
    for (let i = 0; i < 3000; i++) {
      s = step(s, NONE).state;
      for (const m of s.mages) {
        expect(m.ink).toBeGreaterThanOrEqual(0);
        expect(m.ink).toBeLessThanOrEqual(m.maxInk);
        expect(m.hp).toBeGreaterThanOrEqual(0);
        expect(m.hp).toBeLessThanOrEqual(m.maxHp);
      }
    }
  });
});

describe('инвариант: раунд всегда разрешается (не «зависает»)', () => {
  it('раунд заканчивается в пределах duration + suddenDeathMax', () => {
    let s = createMatch({
      mages: [{}, {}], // никто не бьёт → гарантированно через таймаут+добой+RNG
      rules: { roundDurationTicks: 200, suddenDeathMaxTicks: 100 },
    });
    let ended = false;
    const bound = 200 + 100 + 5;
    for (let i = 0; i < bound; i++) {
      const r = step(s, NONE);
      s = r.state;
      if (r.events.some((e) => e.type === 'round-end')) {
        ended = true;
        break;
      }
    }
    expect(ended).toBe(true);
  });
});

describe('инвариант/реплей: детерминизм (Р12, Р38)', () => {
  it('два прогона одного журнала дают идентичное состояние (глубокое сравнение)', () => {
    const journal: TickInputs[] = [];
    for (let i = 0; i < 400; i++) {
      // Скриптованный вход мага 0; маг 1 — бот (RNG-джиттер).
      journal.push(i % 37 === 0 ? [{ cast: corpusCast('spark') }, { cast: null }] : NONE);
    }
    const run = () => {
      let s = createMatch({ rngSeed: 4242, rules: { roundDurationTicks: 100000 } });
      for (const inp of journal) s = step(s, inp).state;
      return s;
    };
    expect(run()).toEqual(run());
  });

  it('бот-против-бота: одинаковый сид → идентичный финал', () => {
    const run = () => {
      let s = botDuel({ rngSeed: 99 });
      for (let i = 0; i < 1500; i++) s = step(s, NONE).state;
      return s;
    };
    expect(run()).toEqual(run());
  });
});

describe('инвариант: сериализация состояния round-trip (Р38)', () => {
  it('JSON туда-обратно не теряет данных и продолжает симуляцию идентично', () => {
    let s = createMatch({ rngSeed: 5, rules: { roundDurationTicks: 100000 } });
    const spark: CastOutcome = corpusCast('spark');
    for (let i = 0; i < 50; i++) s = step(s, i === 0 ? [{ cast: spark }, { cast: null }] : NONE).state;

    const restored: SimState = JSON.parse(JSON.stringify(s));
    expect(restored).toEqual(s);

    // Дальнейший шаг от восстановленного = шаг от оригинала.
    const a = step(s, NONE);
    const b = step(restored, NONE);
    expect(b.state).toEqual(a.state);
    expect(b.events).toEqual(a.events);
  });
});
