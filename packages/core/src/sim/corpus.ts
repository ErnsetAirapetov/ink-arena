import { spellPower } from '../spellcraft/power.js';
import type { CastOutcome, Spell } from '../spellcraft/types.js';

// Эталонный корпус Р32 (spellcraft.md#эталонный-корпус) как готовые Spell —
// без рисования штрихов. Нужен боту-манекену (кастует из корпуса по
// расписанию) и сценарным тестам как источник валидных кастов. Стоимость
// чернил здесь — номинальная (бот не рисует линии, длину считать неоткуда);
// числа-номиналы — в config было бы избыточно, это фикстуры корпуса.
//
// Формы действия совпадают с разбором #37: shield/heal — primary-форма,
// buff/debuff — augment поверх атаки (resolveAction → 'attack').

export type CorpusSpellId = 'spark' | 'fireWall' | 'spring' | 'stoneCurse' | 'stormWrath';

export interface CorpusEntry {
  readonly spell: Spell;
  // Номинальная стоимость чернил каста ботом.
  readonly cost: number;
}

// Хелпер-конструктор, чтобы поля Spell не расползались по определениям.
function spell(over: Partial<Spell> & Pick<Spell, 'element' | 'coreSize'>): Spell {
  return {
    action: 'attack',
    modifiers: [],
    coreAccuracy: 1,
    ...over,
  };
}

export const CORPUS: Readonly<Record<CorpusSpellId, CorpusEntry>> = {
  // 1. Искра — маленькая ⚡ без глаголов: дешёвый быстрый джеб.
  spark: {
    spell: spell({ element: 'lightning', coreSize: 80 }),
    cost: 6,
  },
  // 2. Огненная стена — ⌒ + 🔥: щит со сродством огня (primary shield).
  fireWall: {
    spell: spell({
      element: 'fire',
      action: 'shield',
      modifiers: [{ verb: 'shield', role: 'primary', weight: 0.8, accuracy: 1 }],
      coreSize: 180,
    }),
    cost: 12,
  },
  // 3. Родник — спираль + 💧: хил себе (primary heal).
  spring: {
    spell: spell({
      element: 'water',
      action: 'heal',
      modifiers: [{ verb: 'heal', role: 'primary', weight: 0.8, accuracy: 1 }],
      coreSize: 160,
    }),
    cost: 12,
  },
  // 4. Проклятие камня — \ + ⛰: атака-снаряд, вешающий уязвимость (augment debuff).
  stoneCurse: {
    spell: spell({
      element: 'earth',
      modifiers: [{ verb: 'debuff', role: 'augment', weight: 0.6, accuracy: 1 }],
      coreSize: 150,
    }),
    cost: 14,
  },
  // 5. Гнев бури — большая ⚡ + два /: дорогой медленный нюк (augment buff×2).
  stormWrath: {
    spell: spell({
      element: 'lightning',
      modifiers: [
        { verb: 'buff', role: 'augment', weight: 0.7, accuracy: 1 },
        { verb: 'buff', role: 'augment', weight: 0.7, accuracy: 1 },
      ],
      coreSize: 320,
    }),
    cost: 24,
  },
};

// Готовый CastOutcome для корпусного заклинания (сила из формулы Р4).
export function corpusCast(id: CorpusSpellId): Extract<CastOutcome, { kind: 'spell' }> {
  const entry = CORPUS[id];
  return { kind: 'spell', spell: entry.spell, cost: entry.cost, power: spellPower(entry.spell) };
}
