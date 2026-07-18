// HUD поверх арены (Р10): HP и чернила обоих магов, счёт матча, таймер раунда.
// Минимально, у краёв — центр арены отдан бою. Числа берутся из состояния и
// core-config (tickRate), своей логики нет. Визуальный модуль.
import { config, type SimState } from '@inkarena/core';
import { clientConfig } from '../config';
import type { Layout } from '../layout';

function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frac: number,
  color: string,
): void {
  const c = clientConfig.colors;
  ctx.fillStyle = c.hpBarBg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

// Пара баров (HP над чернилами) для одного мага у заданной вертикали.
function mageBars(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  mage: SimState['mages'][number],
  topY: number,
  label: string,
): void {
  const c = clientConfig.colors;
  const w = layout.width * 0.4;
  const x = layout.width * 0.04;
  const h = Math.max(8, layout.height * 0.012);
  ctx.font = `${Math.round(h * 1.2)}px system-ui, sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = c.hudText;
  ctx.fillText(label, x, topY - 2);
  bar(ctx, x, topY, w, h, mage.hp / mage.maxHp, c.hpBar);
  bar(ctx, x, topY + h + 3, w, h, mage.ink / mage.maxInk, c.inkBar);
}

export function drawHud(ctx: CanvasRenderingContext2D, layout: Layout, state: SimState): void {
  const c = clientConfig.colors;
  const a = layout.arena;

  // Соперник — вверху арены, игрок — у нижнего края (перед блокнотом).
  mageBars(ctx, layout, state.mages[1], a.y + 14, 'Бот');
  const playerBarsTop = a.y + a.h - Math.max(8, layout.height * 0.012) * 2 - 20;
  mageBars(ctx, layout, state.mages[0], playerBarsTop, 'Ты');

  // Счёт матча по центру сверху.
  ctx.fillStyle = c.hudText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `${Math.round(Math.max(14, layout.height * 0.02))}px system-ui, sans-serif`;
  ctx.fillText(`Ты ${state.match.wins[0]} : ${state.match.wins[1]} Бот`, layout.width / 2, a.y + 10);

  // Таймер раунда под счётом.
  const tickRate = config.sim.tickRate;
  const remainTicks = Math.max(0, state.round.phase === 'active'
    ? state.match.rules.roundDurationTicks - state.round.elapsedTicks
    : 0);
  const timerText = state.round.phase === 'sudden-death'
    ? 'Добой!'
    : `${Math.ceil(remainTicks / tickRate)} с`;
  ctx.font = `${Math.round(Math.max(12, layout.height * 0.016))}px system-ui, sans-serif`;
  ctx.fillText(timerText, layout.width / 2, a.y + 10 + Math.max(14, layout.height * 0.02) + 6);

  ctx.textAlign = 'left';
}
