import { describe, expect, it } from 'vitest';
import { botAct } from './bot.js';
import { makeRng } from './rng.js';
import type { BotState } from './types.js';

function makeBot(over: Partial<BotState> = {}): BotState {
  return {
    rotation: ['spark', 'fireWall'],
    rotationIndex: 0,
    nextCastTick: 5,
    intervalTicks: 10,
    jitterTicks: 0,
    firstCastDelayTicks: 5,
    ...over,
  };
}

describe('бот-манекен (Р32)', () => {
  it('молчит до nextCastTick', () => {
    const bot = makeBot();
    const rng = makeRng(1);
    expect(botAct(bot, rng, 0)).toBeNull();
    expect(botAct(bot, rng, 4)).toBeNull();
  });

  it('кастует по расписанию, проходя ротацию по кругу', () => {
    const bot = makeBot({ nextCastTick: 0, intervalTicks: 10, jitterTicks: 0 });
    const rng = makeRng(1);
    const c0 = botAct(bot, rng, 0);
    expect(c0?.kind).toBe('spell');
    expect(c0 && c0.kind === 'spell' && c0.spell.element).toBe('lightning'); // spark
    expect(bot.nextCastTick).toBe(10);

    expect(botAct(bot, rng, 5)).toBeNull();
    const c1 = botAct(bot, rng, 10);
    expect(c1 && c1.kind === 'spell' && c1.spell.element).toBe('fire'); // fireWall
    const c2 = botAct(bot, rng, 20);
    expect(c2 && c2.kind === 'spell' && c2.spell.element).toBe('lightning'); // назад к spark
  });

  it('детерминирован по сиду: одинаковый сид → одинаковое расписание с джиттером', () => {
    const run = () => {
      const bot = makeBot({ nextCastTick: 0, intervalTicks: 10, jitterTicks: 5 });
      const rng = makeRng(123);
      const nextTicks: number[] = [];
      let t = 0;
      for (let i = 0; i < 5; i++) {
        botAct(bot, rng, t);
        nextTicks.push(bot.nextCastTick);
        t = bot.nextCastTick;
      }
      return nextTicks;
    };
    expect(run()).toEqual(run());
  });

  it('джиттер держит интервал ≥ 1', () => {
    const bot = makeBot({ nextCastTick: 0, intervalTicks: 1, jitterTicks: 100 });
    const rng = makeRng(9);
    let t = 0;
    for (let i = 0; i < 50; i++) {
      const prev = t;
      botAct(bot, rng, t);
      expect(bot.nextCastTick).toBeGreaterThanOrEqual(prev + 1);
      t = bot.nextCastTick;
    }
  });
});
