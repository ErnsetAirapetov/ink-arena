// Рендер арены (верхние ~70%, Р10): фигуры магов, щиты, снаряды в полёте,
// вспышки попаданий. Всё — по состоянию/событиям core, своей игровой логики
// нет. Визуальный модуль — проверяется руками.
import type { SimState } from '@inkarena/core';
import { clientConfig } from '../config';
import type { Layout, Vec2 } from '../layout';
import type { HitFlash, RenderProjectile } from './types';

function minSide(layout: Layout): number {
  return Math.min(layout.width, layout.height);
}

function fillCircle(ctx: CanvasRenderingContext2D, c: Vec2, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawArena(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: SimState,
  projectiles: readonly RenderProjectile[],
  hitFlashes: readonly HitFlash[],
  now: number,
): void {
  const c = clientConfig.colors;
  const a = layout.arena;
  ctx.fillStyle = c.bg;
  ctx.fillRect(a.x, a.y, a.w, a.h);

  const mageR = minSide(layout) * clientConfig.mage.radiusRatio;
  const colors = [c.player, c.enemy];

  // Фигуры магов + их щиты (концентрические кольца по стихийному сродству).
  for (let i = 0; i < 2; i++) {
    const pos = layout.mages[i];
    fillCircle(ctx, pos, mageR, colors[i]);

    const shields = state.mages[i].shields;
    for (let s = 0; s < shields.length; s++) {
      const ringR = mageR + 6 + s * 7;
      ctx.strokeStyle = clientConfig.elementColors[shields[s].affinity];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Снаряды в полёте (Р22: крупное само телеграфирует себя — размер не
  // масштабируем по силе в MVP, различимость важнее, Р19).
  const projR = minSide(layout) * clientConfig.projectile.radiusRatio;
  for (const p of projectiles) {
    fillCircle(ctx, p.pos, projR, c.projectile);
    ctx.strokeStyle = clientConfig.elementColors[p.element];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, projR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Вспышки попаданий на цели.
  for (const h of hitFlashes) {
    const alpha = Math.max(0, (h.until - now) / clientConfig.timings.hitFlashMs);
    if (alpha <= 0) continue;
    const pos = layout.mages[h.mage];
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = c.hit;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, mageR + 10 - alpha * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
