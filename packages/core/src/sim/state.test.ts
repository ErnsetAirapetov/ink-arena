import { describe, expect, it } from 'vitest';
import { config } from '../config.js';
import { createMatch, resetMageForRound } from './state.js';

describe('createMatch (Р22/Р28)', () => {
  it('по умолчанию — bo3, маг 0 игрок, маг 1 бот, полные ресурсы', () => {
    const s = createMatch();
    expect(s.match.rules.winsNeeded).toBe(config.sim.match.winsNeeded);
    expect(s.match.wins).toEqual([0, 0]);
    expect(s.mages[0].bot).toBeNull();
    expect(s.mages[1].bot).not.toBeNull();
    for (const m of s.mages) {
      expect(m.hp).toBe(m.maxHp);
      expect(m.ink).toBe(m.maxInk);
      expect(m.shields).toEqual([]);
      expect(m.vulnerability).toBeNull();
    }
    expect(s.round.index).toBe(0);
    expect(s.round.phase).toBe('active');
    expect(s.projectiles).toEqual([]);
  });

  it('переопределения правил и магов применяются (для тестов)', () => {
    const s = createMatch({
      rngSeed: 7,
      rules: { winsNeeded: 3, roundDurationTicks: 10 },
      mages: [{ maxHp: 30, startInk: 5 }, { maxHp: 40, bot: { intervalTicks: 2 } }],
    });
    expect(s.rng.state).toBe(7);
    expect(s.match.rules.winsNeeded).toBe(3);
    expect(s.match.rules.roundDurationTicks).toBe(10);
    expect(s.mages[0].maxHp).toBe(30);
    expect(s.mages[0].ink).toBe(5);
    expect(s.mages[1].maxHp).toBe(40);
    expect(s.mages[1].bot?.intervalTicks).toBe(2);
  });

  it('состояние сериализуется в JSON и обратно без потерь', () => {
    const s = createMatch({ mages: [{}, { bot: {} }] });
    const round = JSON.parse(JSON.stringify(s));
    expect(round).toEqual(s);
  });
});

describe('resetMageForRound — «чистый лист» (Р28)', () => {
  it('восстанавливает HP/чернила, снимает щиты и статусы', () => {
    const s = createMatch({ mages: [{}, { bot: {} }] });
    const mage = s.mages[0];
    mage.hp = 12;
    mage.ink = 3;
    mage.shields.push({ affinity: 'fire', hp: 50 });
    mage.vulnerability = { multiplier: 1.5, remainingTicks: 100 };

    resetMageForRound(mage, 200);

    expect(mage.hp).toBe(mage.maxHp);
    expect(mage.ink).toBe(mage.maxInk);
    expect(mage.shields).toEqual([]);
    expect(mage.vulnerability).toBeNull();
  });

  it('перезаводит расписание бота от нового старта раунда', () => {
    const s = createMatch({ mages: [{}, { bot: {} }] });
    const bot = s.mages[1];
    bot.bot!.rotationIndex = 3;
    bot.bot!.nextCastTick = 5;
    resetMageForRound(bot, 500);
    expect(bot.bot!.rotationIndex).toBe(0);
    expect(bot.bot!.nextCastTick).toBe(500 + bot.bot!.firstCastDelayTicks);
  });
});
