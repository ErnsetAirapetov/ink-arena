import { describe, expect, it } from 'vitest';
import { config } from '../config.js';
import type { Stroke } from '../geometry/types.js';
import { inkCost } from './cost.js';

const line = (len: number): Stroke => [
  { x: 0, y: 0 },
  { x: len, y: 0 },
];

describe('inkCost — cost-модель чернил (Р21)', () => {
  it('пустая композиция стоит ноль', () => {
    expect(inkCost([])).toBe(0);
  });

  it('стоимость = база за глиф + плата за длину линии', () => {
    const cfg = config.spellcraft.cost;
    expect(inkCost([line(100)])).toBeCloseTo(cfg.perGlyph + cfg.perInkLength * 100, 6);
  });

  it('каждый лишний глиф-штрих добавляет базовую плату', () => {
    expect(inkCost([line(50), line(50)]) - inkCost([line(50)])).toBeCloseTo(
      config.spellcraft.cost.perGlyph + config.spellcraft.cost.perInkLength * 50,
      6,
    );
  });

  it('длиннее линия — дороже (монотонность по длине)', () => {
    expect(inkCost([line(200)])).toBeGreaterThan(inkCost([line(50)]));
  });

  it('коэффициенты берутся только из config (нет магических чисел)', () => {
    // Стоимость пропорциональна коэффициентам конфига.
    const expected =
      config.spellcraft.cost.perGlyph * 3 +
      config.spellcraft.cost.perInkLength * (10 + 20 + 30);
    expect(inkCost([line(10), line(20), line(30)])).toBeCloseTo(expected, 6);
  });
});
