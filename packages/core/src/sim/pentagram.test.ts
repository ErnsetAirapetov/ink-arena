import { describe, expect, it } from 'vitest';
import { ELEMENTS, type Element } from '../recognition/glyphs.js';
import { BEATS, elementMatchup } from './pentagram.js';

// Ожидаемая таблица из Р24 / spellcraft.md#пять-стихий (независимая копия —
// сверяем реализацию с источником правды, а не с самой собой).
const EXPECTED_BEATS: Record<Element, [Element, Element]> = {
  fire: ['air', 'earth'],
  water: ['fire', 'air'],
  air: ['earth', 'lightning'],
  earth: ['lightning', 'water'],
  lightning: ['water', 'fire'],
};

describe('пентаграмма контрпиков (Р24)', () => {
  it('каждая стихия сильна ровно против двух', () => {
    for (const e of ELEMENTS) {
      expect(BEATS[e].length).toBe(2);
    }
  });

  it('каждая стихия слаба ровно против двух', () => {
    for (const defender of ELEMENTS) {
      const weakAgainst = ELEMENTS.filter((a) => a !== defender && BEATS[a].includes(defender));
      expect(weakAgainst.length).toBe(2);
    }
  });

  it('все 5×2 пары «сильна» дают strong', () => {
    for (const attacker of ELEMENTS) {
      for (const defender of EXPECTED_BEATS[attacker]) {
        expect(elementMatchup(attacker, defender)).toBe('strong');
      }
    }
  });

  it('все 5×2 пары «слаба» дают weak', () => {
    for (const attacker of ELEMENTS) {
      // Слаба против тех, кто бьёт её саму.
      const weakVs = ELEMENTS.filter((d) => EXPECTED_BEATS[d].includes(attacker));
      expect(weakVs.length).toBe(2);
      for (const defender of weakVs) {
        expect(elementMatchup(attacker, defender)).toBe('weak');
      }
    }
  });

  it('одинаковые стихии — neutral', () => {
    for (const e of ELEMENTS) {
      expect(elementMatchup(e, e)).toBe('neutral');
    }
  });

  it('матчап антисимметричен: strong ⇔ обратное weak', () => {
    for (const a of ELEMENTS) {
      for (const b of ELEMENTS) {
        if (a === b) continue;
        const ab = elementMatchup(a, b);
        const ba = elementMatchup(b, a);
        if (ab === 'strong') expect(ba).toBe('weak');
        if (ab === 'weak') expect(ba).toBe('strong');
        if (ab === 'neutral') expect(ba).toBe('neutral');
      }
    }
  });
});
