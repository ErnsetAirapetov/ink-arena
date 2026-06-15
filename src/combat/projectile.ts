import { colorFor } from '../effects/effects';

export interface Pt {
  x: number;
  y: number;
}

/** Точка на квадратичной кривой Безье a→c→b при параметре t∈[0,1]. */
export function quadraticPoint(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

/** Контрольная точка дуги: середина from→to + перпендикулярное смещение offset. */
export function arcControl(from: Pt, to: Pt, offset: number): Pt {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len; // перпендикуляр к направлению
  const py = dx / len;
  return { x: mx + px * offset, y: my + py * offset };
}

export type ProjectileTarget = 'dummy' | 'player';

interface Projectile {
  from: Pt;
  to: Pt;
  control: Pt;
  flightMs: number;
  elapsed: number;
  damage: number;
  colorId: string;
  target: ProjectileTarget;
  element: string;
}

export interface Arrival {
  x: number;
  y: number;
  damage: number;
  colorId: string;
  target: ProjectileTarget;
  element: string;
}

export interface SpawnOpts {
  from: Pt;
  to: Pt;
  flightMs: number;
  damage: number;
  colorId: string;
  target?: ProjectileTarget;
  element?: string;
}

/** Доля случайной «выгнутости» дуги от длины пути (только визуал, на тайминг не влияет). */
const ARC_FACTOR = 0.35;

/** Снаряды в полёте: спавн, продвижение, прилёты, отрисовка. */
export class ProjectileSystem {
  private projectiles: Projectile[] = [];

  spawn(opts: SpawnOpts): void {
    const from = { x: opts.from.x, y: opts.from.y };
    const to = { x: opts.to.x, y: opts.to.y };
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const offset = (Math.random() * 2 - 1) * dist * ARC_FACTOR;
    this.projectiles.push({
      from,
      to,
      control: arcControl(from, to, offset),
      flightMs: opts.flightMs,
      elapsed: 0,
      damage: opts.damage,
      colorId: opts.colorId,
      target: opts.target ?? 'dummy',
      element: opts.element ?? '',
    });
  }

  /** Продвинуть на dtMs. Вернуть долетевшие (и убрать их из системы). */
  update(dtMs: number): Arrival[] {
    const arrived: Arrival[] = [];
    for (const p of this.projectiles) {
      p.elapsed += dtMs;
      if (p.elapsed >= p.flightMs) {
        arrived.push({
          x: p.to.x,
          y: p.to.y,
          damage: p.damage,
          colorId: p.colorId,
          target: p.target,
          element: p.element,
        });
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.elapsed < p.flightMs);
    return arrived;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.projectiles) {
      const t = Math.min(1, p.elapsed / p.flightMs);
      const pos = quadraticPoint(p.from, p.control, p.to, t);
      const color = colorFor(p.colorId);
      // ореол
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 12, 0, 2 * Math.PI);
      ctx.fill();
      // ядро
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }
}
