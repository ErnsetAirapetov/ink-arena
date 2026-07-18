import { describe, expect, it } from 'vitest';
import { config } from '../config.js';
import type { Spell } from './types.js';
import { castAccuracy, compositionBase, sizeFactor, spellPower } from './power.js';

const spell = (over: Partial<Spell> = {}): Spell => ({
  element: 'lightning',
  action: 'attack',
  modifiers: [],
  coreAccuracy: 1,
  coreSize: config.spellcraft.power.size.refDiagonal,
  ...over,
});

describe('sizeFactor — f(размер) (Р4, Р30)', () => {
  it('монотонно возрастает по размеру ядра', () => {
    expect(sizeFactor(50)).toBeLessThan(sizeFactor(150));
    expect(sizeFactor(150)).toBeLessThan(sizeFactor(400));
  });

  it('зажата в [min, max] из config', () => {
    const { min, max } = config.spellcraft.power.size;
    expect(sizeFactor(1)).toBeGreaterThanOrEqual(min);
    expect(sizeFactor(100000)).toBeLessThanOrEqual(max);
  });

  it('на опорном размере даёт 1 (до зажатия)', () => {
    expect(sizeFactor(config.spellcraft.power.size.refDiagonal)).toBeCloseTo(1, 6);
  });
});

describe('compositionBase — база(композиция) (Р4)', () => {
  it('без глаголов равна собственной базе стихии', () => {
    expect(compositionBase(spell())).toBe(config.spellcraft.power.elementBase.lightning);
  });

  it('глагол добавляет вклад, взвешенный относительным размером (Р26 п.5)', () => {
    const withBuff = spell({
      modifiers: [{ verb: 'buff', role: 'augment', weight: 0.5, accuracy: 1 }],
    });
    expect(compositionBase(withBuff)).toBeCloseTo(
      config.spellcraft.power.elementBase.lightning +
        config.spellcraft.power.verbBase.buff * 0.5,
      6,
    );
  });
});

describe('castAccuracy — точность руки (Р4)', () => {
  it('без глаголов равна точности ядра', () => {
    expect(castAccuracy(spell({ coreAccuracy: 0.9 }))).toBeCloseTo(0.9, 6);
  });

  it('усредняет точности с весами (ядро = 1, модификатор = вес)', () => {
    const s = spell({
      coreAccuracy: 1,
      modifiers: [{ verb: 'buff', role: 'augment', weight: 1, accuracy: 0.5 }],
    });
    expect(castAccuracy(s)).toBeCloseTo(0.75, 6);
  });
});

describe('spellPower — база × точность × f(размер) (Р4, Р30)', () => {
  it('произведение трёх множителей', () => {
    const s = spell({ coreAccuracy: 0.8 });
    expect(spellPower(s)).toBeCloseTo(
      compositionBase(s) * castAccuracy(s) * sizeFactor(s.coreSize),
      6,
    );
  });

  it('выше точность — выше сила (скилл руки, Р4)', () => {
    expect(spellPower(spell({ coreAccuracy: 1 }))).toBeGreaterThan(
      spellPower(spell({ coreAccuracy: 0.7 })),
    );
  });

  it('крупнее ядро — выше сила (трейд-офф размера, Р4)', () => {
    expect(spellPower(spell({ coreSize: 400 }))).toBeGreaterThan(
      spellPower(spell({ coreSize: 120 })),
    );
  });
});
