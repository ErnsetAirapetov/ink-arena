import { describe, it, expect } from 'vitest';
import { quadraticPoint, arcControl, ProjectileSystem } from '../src/combat/projectile';

describe('projectile — математика', () => {
  it('quadraticPoint — концы кривой', () => {
    const a = { x: 0, y: 0 };
    const c = { x: 10, y: 10 };
    const b = { x: 20, y: 0 };
    expect(quadraticPoint(a, c, b, 0)).toEqual({ x: 0, y: 0 });
    expect(quadraticPoint(a, c, b, 1)).toEqual({ x: 20, y: 0 });
  });

  it('quadraticPoint — середина', () => {
    const a = { x: 0, y: 0 };
    const c = { x: 10, y: 10 };
    const b = { x: 20, y: 0 };
    expect(quadraticPoint(a, c, b, 0.5)).toEqual({ x: 10, y: 5 });
  });

  it('arcControl — перпендикулярное смещение от середины', () => {
    // from→to вдоль X, перпендикуляр — по Y
    expect(arcControl({ x: 0, y: 0 }, { x: 100, y: 0 }, 50)).toEqual({ x: 50, y: 50 });
  });
});

describe('projectile — система', () => {
  it('update до конца времени полёта возвращает один прилёт с уроном/цветом', () => {
    const sys = new ProjectileSystem();
    sys.spawn({ from: { x: 0, y: 0 }, to: { x: 100, y: 0 }, flightMs: 1000, damage: 42, colorId: 'fire' });

    expect(sys.update(500)).toEqual([]); // ещё в полёте
    const arrived = sys.update(500); // 1000 мс прошло
    expect(arrived).toHaveLength(1);
    expect(arrived[0].damage).toBe(42);
    expect(arrived[0].colorId).toBe('fire');
    expect(arrived[0].x).toBe(100);
    expect(arrived[0].y).toBe(0);
  });

  it('прилетевший снаряд удаляется из системы', () => {
    const sys = new ProjectileSystem();
    sys.spawn({ from: { x: 0, y: 0 }, to: { x: 10, y: 0 }, flightMs: 100, damage: 5, colorId: 'water' });
    sys.update(100); // прилетел
    expect(sys.update(100)).toEqual([]); // больше нечего обновлять
  });

  it('несколько снарядов независимы по времени', () => {
    const sys = new ProjectileSystem();
    sys.spawn({ from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, flightMs: 1000, damage: 1, colorId: 'fire' });
    sys.spawn({ from: { x: 0, y: 0 }, to: { x: 2, y: 0 }, flightMs: 2000, damage: 2, colorId: 'water' });
    const first = sys.update(1000);
    expect(first).toHaveLength(1);
    expect(first[0].damage).toBe(1);
    const second = sys.update(1000);
    expect(second).toHaveLength(1);
    expect(second[0].damage).toBe(2);
  });
});

describe('ProjectileSystem — цель и стихия снаряда', () => {
  it('прилёт несёт target и element', () => {
    const ps = new ProjectileSystem();
    ps.spawn({
      from: { x: 0, y: 0 },
      to: { x: 10, y: 0 },
      flightMs: 100,
      damage: 15,
      colorId: 'fire',
      target: 'player',
      element: 'fire',
    });
    const arrivals = ps.update(200);
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0].target).toBe('player');
    expect(arrivals[0].element).toBe('fire');
  });

  it('по умолчанию target = dummy, element = пусто', () => {
    const ps = new ProjectileSystem();
    ps.spawn({ from: { x: 0, y: 0 }, to: { x: 10, y: 0 }, flightMs: 100, damage: 5, colorId: 'water' });
    const arrivals = ps.update(200);
    expect(arrivals[0].target).toBe('dummy');
    expect(arrivals[0].element).toBe('');
  });
});
