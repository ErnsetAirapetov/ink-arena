import { describe, expect, it } from 'vitest';
import type { Stroke } from '../geometry/types.js';
import { GOLDEN_CORPUS } from '../recognition/golden/corpus.js';
import { encloseComposition } from './fixtures.js';
import { parseComposition } from './parse.js';
import type { CastOutcome } from './types.js';

// Golden-тест валидности (Р32): пять эталонных заклинаний из
// game/spellcraft.md#эталонный-корпус должны распознаваться грамматикой Р26
// как валидные с ожидаемой структурой (ядро + нужные глаголы). Штрихи глифов
// берём из общего корпуса recognition (#36), добавляем охватывающий круг.

interface Expected {
  readonly element: string;
  readonly action: string;
  readonly verbs: readonly string[];
}

const EXPECTED: Readonly<Record<string, Expected>> = {
  Искра: { element: 'lightning', action: 'attack', verbs: [] },
  'Огненная стена': { element: 'fire', action: 'shield', verbs: ['shield'] },
  Родник: { element: 'water', action: 'heal', verbs: ['heal'] },
  'Проклятие камня': { element: 'earth', action: 'attack', verbs: ['debuff'] },
  'Гнев бури': { element: 'lightning', action: 'attack', verbs: ['buff', 'buff'] },
};

function castCorpus(name: string): CastOutcome {
  const spell = GOLDEN_CORPUS.find((s) => s.name === name);
  if (!spell) throw new Error(`нет эталона ${name}`);
  const glyphs: Stroke[] = spell.glyphs.map((g) => g.stroke);
  return parseComposition([...glyphs, encloseComposition(glyphs)]);
}

describe('Golden-корпус Р32 — пять эталонов валидны с ожидаемой структурой', () => {
  for (const spell of GOLDEN_CORPUS) {
    it(`${spell.name}: ядро и глаголы совпадают с эталоном`, () => {
      const exp = EXPECTED[spell.name];
      const out = castCorpus(spell.name);
      expect(out.kind).toBe('spell');
      if (out.kind !== 'spell') throw new Error('ожидалось валидное заклинание');
      expect(out.spell.element).toBe(exp.element);
      expect(out.spell.action).toBe(exp.action);
      expect([...out.spell.modifiers].map((m) => m.verb).sort()).toEqual([...exp.verbs].sort());
      expect(out.cost).toBeGreaterThan(0);
      expect(out.power).toBeGreaterThan(0);
    });
  }

  it('cost-модель ранжирует корпус: «Гнев бури» дороже «Искры» (Р21, Р32)', () => {
    const spark = castCorpus('Искра');
    const storm = castCorpus('Гнев бури');
    if (spark.kind !== 'spell' || storm.kind !== 'spell') throw new Error('оба валидны');
    expect(storm.cost).toBeGreaterThan(spark.cost);
  });

  it('«Гнев бури» сильнее «Искры» (крупное ядро + бафы, Р4)', () => {
    const spark = castCorpus('Искра');
    const storm = castCorpus('Гнев бури');
    if (spark.kind !== 'spell' || storm.kind !== 'spell') throw new Error('оба валидны');
    expect(storm.power).toBeGreaterThan(spark.power);
  });
});
