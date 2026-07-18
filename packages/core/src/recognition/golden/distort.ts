import type { Point, Stroke } from '../../geometry/types.js';

// Детерминированные искажения штрихов для golden-корпуса. Ядру запрещён
// Math.random (правило core), поэтому шум берётся из seeded-LCG — тот же сид
// даёт тот же корпус, регрессия воспроизводима.

// Линейный конгруэнтный генератор (числа из Numerical Recipes).
export function makeRng(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000; // [0,1)
  };
}

export function translate(stroke: Stroke, dx: number, dy: number): Point[] {
  return stroke.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

export function scale(stroke: Stroke, k: number): Point[] {
  return stroke.map((p) => ({ x: p.x * k, y: p.y * k }));
}

// Поворот вокруг центроида штриха на угол (рад).
export function rotate(stroke: Stroke, angle: number): Point[] {
  const n = stroke.length || 1;
  let cx = 0;
  let cy = 0;
  for (const p of stroke) {
    cx += p.x;
    cy += p.y;
  }
  cx /= n;
  cy /= n;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return stroke.map((p) => {
    const x = p.x - cx;
    const y = p.y - cy;
    return { x: cx + x * cos - y * sin, y: cy + x * sin + y * cos };
  });
}

// Гауссоподобный шум (сумма двух равномерных) амплитуды `amp` в долях
// диагонали bbox штриха.
export function jitter(stroke: Stroke, amp: number, rng: () => number): Point[] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of stroke) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const diag = Math.hypot(maxX - minX, maxY - minY) || 1;
  const a = amp * diag;
  const noise = (): number => (rng() + rng() - 1) * a;
  return stroke.map((p) => ({ x: p.x + noise(), y: p.y + noise() }));
}
