// Экранная интерполяция снаряда. В ядре снаряд позиции не имеет — только
// таймер полёта (remainingFlightTicks, f(размер), Р4). Клиент рисует полёт,
// раскладывая таймер в путь от мага-владельца к цели. Чистые функции.
import type { Vec2 } from './layout';

// Доля пройденного пути в [0, 1] по остатку тиков полёта. alpha — под-тиковая
// дробь текущего кадра (из аккумулятора) для плавности между шагами sim.
export function flightProgress(total: number, remaining: number, alpha: number): number {
  if (total <= 0) return 1;
  const p = (total - (remaining - alpha)) / total;
  return Math.min(1, Math.max(0, p));
}

export function lerpPoint(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
