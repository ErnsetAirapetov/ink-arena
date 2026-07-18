import { describe, expect, it } from 'vitest';
import { MAX_TICKS_PER_FRAME, ticksToRun } from './loop';

describe('ticksToRun', () => {
  it('точное кратное — целые тики, нулевой остаток', () => {
    expect(ticksToRun(48, 16)).toEqual({ ticks: 3, remainder: 0 });
  });

  it('неполный хвост остаётся остатком (< длительности тика)', () => {
    expect(ticksToRun(40, 16)).toEqual({ ticks: 2, remainder: 8 });
  });

  it('меньше одного тика — ноль тиков, всё в остатке', () => {
    expect(ticksToRun(10, 16)).toEqual({ ticks: 0, remainder: 10 });
  });

  it('большой лаг зажат порогом (без спирали смерти), остаток — под-тиковый', () => {
    const plan = ticksToRun(16 * 100 + 7, 16);
    expect(plan.ticks).toBe(MAX_TICKS_PER_FRAME);
    // Накопленный backlog отброшен, остаётся только дробная часть тика.
    expect(plan.remainder).toBe(7);
  });
});
