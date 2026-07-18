import { describe, expect, it } from 'vitest';
import type { Stroke } from '../geometry/types.js';
import { encloseComposition, place, ring } from './fixtures.js';
import { parseComposition } from './parse.js';

// Собрать композицию: глиф-штрихи + автоматически охватывающий круг.
const withCircle = (glyphs: Stroke[]): Stroke[] => [...glyphs, encloseComposition(glyphs)];

describe('parseComposition — не отправлено (Р27)', () => {
  it('нет замыкающего круга — circle-not-closed', () => {
    const out = parseComposition([place('lightning', 90, 400, 300)]);
    expect(out).toEqual({ kind: 'not-sent', reason: 'circle-not-closed' });
  });

  it('внутри круга нет глифов — empty-composition', () => {
    const out = parseComposition([ring(400, 300, 200)]);
    expect(out).toEqual({ kind: 'not-sent', reason: 'empty-composition' });
  });

  it('глиф целиком снаружи круга — circle-not-enclosing', () => {
    // Маленькое ядро внутри + глиф далеко за кругом.
    const out = parseComposition([
      place('lightning', 60, 400, 300),
      place('buff', 60, 900, 300),
      ring(400, 300, 150),
    ]);
    expect(out).toEqual({ kind: 'not-sent', reason: 'circle-not-enclosing' });
  });
});

describe('parseComposition — осечки, три вида (Р26 п.6, Р29)', () => {
  it('две стихии — two-elements, чернила сгорают', () => {
    const out = parseComposition(withCircle([place('fire', 180, 320, 300), place('water', 180, 520, 300)]));
    expect(out.kind).toBe('misfire');
    if (out.kind !== 'misfire') throw new Error('ожидалась осечка');
    expect(out.reason).toBe('two-elements');
    expect(out.cost).toBeGreaterThan(0);
  });

  it('глагол без стихии — verb-without-element', () => {
    const out = parseComposition(withCircle([place('shield', 120, 400, 300)]));
    expect(out.kind).toBe('misfire');
    if (out.kind !== 'misfire') throw new Error('ожидалась осечка');
    expect(out.reason).toBe('verb-without-element');
  });

  it('глиф на границе круга — glyph-on-boundary', () => {
    // Крупный глиф и малый круг: круг рассекает глиф — не решить внутри/снаружи.
    const out = parseComposition([place('lightning', 400, 400, 300), ring(400, 300, 120)]);
    expect(out.kind).toBe('misfire');
    if (out.kind !== 'misfire') throw new Error('ожидалась осечка');
    expect(out.reason).toBe('glyph-on-boundary');
  });
});

describe('parseComposition — валидные заклинания (Р26)', () => {
  it('ядро без глагола = базовая атака (Р26 п.4)', () => {
    const out = parseComposition(withCircle([place('lightning', 90, 400, 300)]));
    expect(out.kind).toBe('spell');
    if (out.kind !== 'spell') throw new Error('ожидалось заклинание');
    expect(out.spell.element).toBe('lightning');
    expect(out.spell.action).toBe('attack');
    expect(out.spell.modifiers).toEqual([]);
    expect(out.cost).toBeGreaterThan(0);
    expect(out.power).toBeGreaterThan(0);
  });

  it('primary-глагол (щит) задаёт форму действия', () => {
    const out = parseComposition(withCircle([place('fire', 200, 400, 320), place('shield', 110, 400, 190)]));
    expect(out.kind).toBe('spell');
    if (out.kind !== 'spell') throw new Error('ожидалось заклинание');
    expect(out.spell.element).toBe('fire');
    expect(out.spell.action).toBe('shield');
    expect(out.spell.modifiers.map((m) => m.verb)).toEqual(['shield']);
    expect(out.spell.modifiers[0].role).toBe('primary');
  });

  it('augment-глагол (дебаф) форму не меняет — остаётся атака', () => {
    const out = parseComposition(withCircle([place('earth', 200, 400, 300), place('debuff', 100, 560, 180)]));
    expect(out.kind).toBe('spell');
    if (out.kind !== 'spell') throw new Error('ожидалось заклинание');
    expect(out.spell.action).toBe('attack');
    expect(out.spell.modifiers[0]).toMatchObject({ verb: 'debuff', role: 'augment' });
  });

  it('относительный размер модификатора задаёт вес (Р26 п.5)', () => {
    const out = parseComposition(
      withCircle([
        place('lightning', 220, 400, 300),
        place('buff', 150, 400, 120),
        place('buff', 80, 620, 300),
      ]),
    );
    expect(out.kind).toBe('spell');
    if (out.kind !== 'spell') throw new Error('ожидалось заклинание');
    const [big, small] = out.spell.modifiers;
    expect(big.weight).toBeGreaterThan(small.weight);
    // Вес = диагональ модификатора / диагональ ядра (Р26 п.5). Больший
    // глиф — больший вклад.
    expect(big.weight / small.weight).toBeCloseTo(150 / 80, 1);
  });
});
