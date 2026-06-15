import { boundingBox, type Box, type Point } from '../geometry';
import { GLYPHS } from '../recognition/glyphs';
import { COMBOS } from '../spells/combo';

/**
 * Вписывает точки в рамку box с отступом padding: равномерный масштаб
 * (сохраняет пропорцию) и центрирование внутри доступной области.
 */
export function fitPointsToBox(points: Point[], box: Box, padding: number): Point[] {
  const src = boundingBox(points);
  const srcW = src.maxX - src.minX || 1;
  const srcH = src.maxY - src.minY || 1;

  const innerX = box.minX + padding;
  const innerY = box.minY + padding;
  const innerW = box.maxX - box.minX - padding * 2;
  const innerH = box.maxY - box.minY - padding * 2;

  const scale = Math.min(innerW / srcW, innerH / srcH);
  const offsetX = innerX + (innerW - srcW * scale) / 2;
  const offsetY = innerY + (innerH - srcH * scale) / 2;

  return points.map((pt) => ({
    x: offsetX + (pt.x - src.minX) * scale,
    y: offsetY + (pt.y - src.minY) * scale,
    t: 0,
  }));
}

export interface Size {
  w: number;
  h: number;
}

const GHOST = '#cfe0ff';
const TEXT = '#e8eaf0';

export class GuideOverlay {
  visible = true;

  toggle(): void {
    this.visible = !this.visible;
  }

  draw(ctx: CanvasRenderingContext2D, size: Size): void {
    if (!this.visible) return;
    ctx.save();
    ctx.textAlign = 'center';
    const cardsBottom = this.drawGlyphCards(ctx, size);
    this.drawComboLegend(ctx, cardsBottom + 24);
    ctx.restore();
  }

  /** Рисует ряд(ы) гост-карточек, возвращает нижнюю координату блока. */
  private drawGlyphCards(ctx: CanvasRenderingContext2D, size: Size): number {
    const margin = 20;
    const gap = 14;
    const perRow = size.w < 760 ? 3 : 6;
    const cardW = Math.min(120, (size.w - margin * 2 - gap * (perRow - 1)) / perRow);
    const cardH = cardW;
    const labelH = 28;
    let bottom = 0;

    GLYPHS.forEach((g, i) => {
      const r = Math.floor(i / perRow);
      const c = i % perRow;
      const x = margin + c * (cardW + gap);
      const y = 24 + r * (cardH + labelH);
      const box = { minX: x, minY: y, maxX: x + cardW, maxY: y + cardH };

      // рамка карточки
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = GHOST;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cardW, cardH);

      // гост-контур глифа
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = GHOST;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const pts = fitPointsToBox(g.points, box, 16);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
      ctx.stroke();

      // подпись
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = TEXT;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(g.name, x + cardW / 2, y + cardH + 16);

      bottom = Math.max(bottom, y + cardH + labelH);
    });

    return bottom;
  }

  private glyphName(id: string): string {
    return GLYPHS.find((g) => g.id === id)?.name ?? id;
  }

  private drawComboLegend(ctx: CanvasRenderingContext2D, top: number): void {
    const x = 20;
    let y = top;
    ctx.textAlign = 'left';
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = TEXT;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('Комбо (нарисуй два глифа рядом):', x, y);
    y += 20;
    ctx.font = '12px system-ui, sans-serif';
    for (const combo of COMBOS) {
      const a = this.glyphName(combo.parts[0]);
      const b = this.glyphName(combo.parts[1]);
      ctx.fillText(`${a} + ${b} = ${combo.name}`, x, y);
      y += 18;
    }
  }
}
