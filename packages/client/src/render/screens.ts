// Минимальные экраны и оверлеи (docs/game/ux.md): старт, результат матча,
// баннер исхода раунда, подача осечки/подсказки. Меню/онбординг/реплей —
// вне скоупа задачи. Визуальный модуль.
import { clientConfig } from '../config';
import type { Layout } from '../layout';
import type { FeedbackTone } from '../feedback';

function dim(ctx: CanvasRenderingContext2D, layout: Layout, alpha = 0.72): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#0b0d13';
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.globalAlpha = 1;
}

function centeredLines(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  lines: { text: string; size: number; color: string }[],
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const total = lines.reduce((h, l) => h + l.size * 1.6, 0);
  let y = layout.height / 2 - total / 2;
  for (const l of lines) {
    y += (l.size * 1.6) / 2;
    ctx.fillStyle = l.color;
    ctx.font = `${Math.round(l.size)}px system-ui, sans-serif`;
    ctx.fillText(l.text, layout.width / 2, y);
    y += (l.size * 1.6) / 2;
  }
  ctx.textAlign = 'left';
}

export function drawStartScreen(ctx: CanvasRenderingContext2D, layout: Layout): void {
  const c = clientConfig.colors;
  dim(ctx, layout, 1);
  const s = Math.max(20, layout.height * 0.05);
  centeredLines(ctx, layout, [
    { text: 'InkArena', size: s * 1.4, color: c.hudText },
    { text: 'Начерти глиф в блокноте и замкни его кругом', size: s * 0.5, color: c.stroke },
    { text: 'Нажми, чтобы начать бой', size: s * 0.6, color: c.recognized },
  ]);
}

export function drawResultScreen(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  playerWon: boolean,
  wins: readonly [number, number],
): void {
  const c = clientConfig.colors;
  dim(ctx, layout);
  const s = Math.max(20, layout.height * 0.05);
  centeredLines(ctx, layout, [
    { text: playerWon ? 'Победа!' : 'Поражение', size: s * 1.3, color: playerWon ? c.recognized : c.misfire },
    { text: `Счёт  ${wins[0]} : ${wins[1]}`, size: s * 0.7, color: c.hudText },
    { text: 'Нажми для нового матча', size: s * 0.6, color: c.stroke },
  ]);
}

// Баннер исхода раунда — по центру арены во время передышки.
export function drawRoundBanner(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  text: string,
  alpha: number,
): void {
  if (alpha <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = clientConfig.colors.hudText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(Math.max(22, layout.height * 0.045))}px system-ui, sans-serif`;
  ctx.fillText(text, layout.width / 2, layout.arena.h * 0.45);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

const TONE_COLOR: Record<FeedbackTone, keyof typeof clientConfig.colors> = {
  success: 'recognized',
  misfire: 'misfire',
  hint: 'hint',
};

// Подача исхода каста (осечка/подсказка/успех) у границы блокнота — тесно с
// местом рисования, но не поверх боя.
export function drawFeedbackBanner(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  text: string,
  tone: FeedbackTone,
  alpha: number,
): void {
  if (alpha <= 0 || text.length === 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = clientConfig.colors[TONE_COLOR[tone]];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = `${Math.round(Math.max(16, layout.height * 0.026))}px system-ui, sans-serif`;
  ctx.fillText(text, layout.width / 2, layout.notebook.y - 8);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}
