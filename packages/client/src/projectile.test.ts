import { describe, expect, it } from 'vitest';
import { flightProgress, lerpPoint } from './projectile';

describe('flightProgress', () => {
  it('в момент запуска (остаток = полёту) прогресс 0', () => {
    expect(flightProgress(30, 30, 0)).toBe(0);
  });

  it('в момент попадания (остаток 0) прогресс 1', () => {
    expect(flightProgress(30, 0, 0)).toBe(1);
  });

  it('середина полёта — 0.5', () => {
    expect(flightProgress(30, 15, 0)).toBeCloseTo(0.5, 6);
  });

  it('под-тиковая alpha сдвигает прогресс вперёд', () => {
    expect(flightProgress(10, 5, 0.5)).toBeCloseTo(0.55, 6);
  });

  it('прогресс зажат в [0, 1]', () => {
    expect(flightProgress(10, 0, 0.5)).toBe(1);
    expect(flightProgress(30, 35, 0)).toBe(0);
  });
});

describe('lerpPoint', () => {
  it('линейная интерполяция между точками', () => {
    expect(lerpPoint({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5)).toEqual({ x: 5, y: 10 });
  });
});
