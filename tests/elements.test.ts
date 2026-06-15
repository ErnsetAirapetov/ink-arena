import { describe, it, expect } from 'vitest';
import { affinity, ELEMENTS } from '../src/combat/elements';

describe('affinity', () => {
  it('сильная стихия по слабой → множитель > 1', () => {
    expect(affinity('fire', 'air')).toBeGreaterThan(1);
  });

  it('слабая стихия по сильной → множитель < 1', () => {
    expect(affinity('air', 'fire')).toBeLessThan(1);
  });

  it('совпадение стихий → 1', () => {
    expect(affinity('fire', 'fire')).toBe(1);
  });

  it('неизвестная стихия (например, модификатор) → 1', () => {
    expect(affinity('fire', 'shield')).toBe(1);
    expect(affinity('shield', 'water')).toBe(1);
  });

  it('пентаграмма: каждая стихия бьёт ровно 2 и слаба против 2', () => {
    for (const el of ELEMENTS) {
      const others = ELEMENTS.filter((o) => o !== el);
      const strong = others.filter((o) => affinity(el, o) > 1).length;
      const weak = others.filter((o) => affinity(el, o) < 1).length;
      expect(strong, `${el} бьёт`).toBe(2);
      expect(weak, `${el} слаба`).toBe(2);
    }
  });

  it('направленность симметрична: если A бьёт B, то B слаб против A', () => {
    expect(affinity('water', 'fire')).toBeGreaterThan(1);
    expect(affinity('fire', 'water')).toBeLessThan(1);
  });
});
