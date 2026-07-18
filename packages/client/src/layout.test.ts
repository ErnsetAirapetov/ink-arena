import { describe, expect, it } from 'vitest';
import { clientConfig } from './config';
import { computeLayout, pointInRect } from './layout';

describe('computeLayout', () => {
  it('блокнот мага — нижняя полоса во всю ширину, под ареной, без наложения', () => {
    const l = computeLayout(400, 900);
    expect(l.notebook.x).toBe(0);
    expect(l.notebook.w).toBe(400);
    // Блокнот начинается там, где кончается арена — зоны не перекрываются.
    expect(l.notebook.y).toBe(l.arena.y + l.arena.h);
    // Нижний край блокнота — низ экрана.
    expect(l.notebook.y + l.notebook.h).toBe(900);
  });

  it('арена — сверху во всю ширину, около заданной доли высоты', () => {
    const l = computeLayout(400, 900);
    expect(l.arena.x).toBe(0);
    expect(l.arena.y).toBe(0);
    expect(l.arena.w).toBe(400);
    expect(l.arena.h).toBeCloseTo(900 * clientConfig.layout.arenaHeightRatio, 5);
  });

  it('фигура игрока (маг 0) ниже фигуры соперника (маг 1)', () => {
    const l = computeLayout(400, 900);
    expect(l.mages[0].y).toBeGreaterThan(l.mages[1].y);
    // Обе фигуры внутри арены.
    expect(l.mages[0].y).toBeLessThan(l.arena.h);
    expect(l.mages[1].y).toBeGreaterThan(0);
  });
});

describe('pointInRect', () => {
  it('точка внутри блокнота распознаётся, точка в арене — нет', () => {
    const l = computeLayout(400, 900);
    const inNotebook = { x: 200, y: l.notebook.y + 10 };
    const inArena = { x: 200, y: 10 };
    expect(pointInRect(inNotebook, l.notebook)).toBe(true);
    expect(pointInRect(inArena, l.notebook)).toBe(false);
  });
});
