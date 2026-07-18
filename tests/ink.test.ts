import { describe, it, expect } from 'vitest';
import { createInk, inkCost, canAfford, spendInk, regenInk } from '../src/combat/ink';
import { CONFIG } from '../src/config';

describe('ink', () => {
  it('createInk даёт полный пул', () => {
    const ink = createInk(100);
    expect(ink.current).toBe(100);
    expect(ink.max).toBe(100);
  });

  it('inkCost = база + плата за длину штрихов', () => {
    const { baseCost, costPerPx } = CONFIG.combat.ink;
    expect(inkCost(0)).toBeCloseTo(baseCost);
    expect(inkCost(200)).toBeCloseTo(baseCost + costPerPx * 200);
  });

  it('canAfford учитывает точный запас', () => {
    const ink = createInk(30);
    expect(canAfford(ink, 30)).toBe(true);
    expect(canAfford(ink, 30.01)).toBe(false);
    expect(canAfford(ink, 0)).toBe(true);
  });

  it('spendInk списывает стоимость', () => {
    const ink = createInk(100);
    expect(spendInk(ink, 30).current).toBe(70);
  });

  it('spendInk не уходит ниже нуля (сжигание при осечке гасит остаток)', () => {
    const ink = createInk(20);
    expect(spendInk(ink, 50).current).toBe(0);
  });

  it('spendInk не мутирует исходный пул', () => {
    const ink = createInk(100);
    spendInk(ink, 40);
    expect(ink.current).toBe(100);
  });

  it('regenInk восполняет по ставке за секунду', () => {
    const ink = spendInk(createInk(100), 60); // 40
    expect(regenInk(ink, 10, 1000).current).toBeCloseTo(50);
    expect(regenInk(ink, 10, 500).current).toBeCloseTo(45);
  });

  it('regenInk не превышает максимум', () => {
    const ink = spendInk(createInk(100), 5); // 95
    expect(regenInk(ink, 100, 1000).current).toBe(100);
  });
});
