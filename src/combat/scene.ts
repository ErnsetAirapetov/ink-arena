import type { Combatant } from './combat';
import { type Player, isShielded } from './player';

interface Floater {
  value: number;
  x: number;
  y: number;
  life: number; // 1..0
}

export interface Size {
  w: number;
  h: number;
}

/**
 * Рисует сцену боя (игрок-кастер слева, манекен справа, HP-бар) и держит
 * транзитное состояние анимаций. Логическое состояние HP/щита — снаружи.
 */
export class CombatScene {
  private flash = 0; // 0..1 интенсивность вспышки попадания
  private shake = 0; // амплитуда тряски манекена (px)
  private floaters: Floater[] = [];
  private dummyPos = { x: 0, y: 0 };
  private playerPos = { x: 0, y: 0 };

  /** Текущая позиция манекена — цель снарядов. */
  get target(): { x: number; y: number } {
    return this.dummyPos;
  }

  /** Текущая позиция игрока — точка вылета снарядов. */
  get origin(): { x: number; y: number } {
    return this.playerPos;
  }

  /** Запустить анимацию попадания с числом урона. */
  hit(amount: number): void {
    this.flash = 1;
    this.shake = 12;
    this.floaters.push({
      value: amount,
      x: this.dummyPos.x,
      y: this.dummyPos.y - 60,
      life: 1,
    });
  }

  /** Продвинуть таймеры анимаций. */
  update(dtMs: number): void {
    const k = dtMs / 1000;
    this.flash = Math.max(0, this.flash - k * 3);
    this.shake = Math.max(0, this.shake - k * 40);
    for (const f of this.floaters) {
      f.y -= dtMs * 0.03;
      f.life -= k * 1.2;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, dummy: Combatant, player: Player, size: Size): void {
    const playerX = size.w * 0.2;
    const dummyX = size.w * 0.75;
    const groundY = size.h * 0.7;
    this.dummyPos = { x: dummyX, y: groundY - 80 };
    this.playerPos = { x: playerX, y: groundY - 60 }; // уровень руки — откуда летит снаряд

    this.drawCaster(ctx, playerX, groundY, player);
    this.drawDummy(ctx, dummyX, groundY, dummy);
    this.drawFloaters(ctx);
  }

  private drawCaster(
    ctx: CanvasRenderingContext2D,
    x: number,
    groundY: number,
    player: Player,
  ): void {
    // аура щита позади фигуры
    if (isShielded(player)) {
      const sec = Math.ceil(player.shieldMs / 1000);
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#c0a7ff';
      ctx.beginPath();
      ctx.arc(x, groundY - 55, 48, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#c0a7ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, groundY - 55, 48, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#c0a7ff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`щит ${sec}с`, x, groundY - 116);
      ctx.restore();
    }

    // фигура-кастер
    ctx.save();
    ctx.strokeStyle = '#9fb4ff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, groundY - 90, 16, 0, 2 * Math.PI); // голова
    ctx.moveTo(x, groundY - 74);
    ctx.lineTo(x, groundY - 24); // туловище
    ctx.moveTo(x, groundY - 24);
    ctx.lineTo(x - 16, groundY); // левая нога
    ctx.moveTo(x, groundY - 24);
    ctx.lineTo(x + 16, groundY); // правая нога
    ctx.moveTo(x, groundY - 60);
    ctx.lineTo(x + 30, groundY - 72); // рука к манекену
    ctx.stroke();
    ctx.restore();
  }

  private drawDummy(
    ctx: CanvasRenderingContext2D,
    x: number,
    groundY: number,
    dummy: Combatant,
  ): void {
    const shakeX = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const cx = x + shakeX;

    ctx.save();
    ctx.globalAlpha = dummy.alive ? 1 : 0.3; // мёртвый — призрачный до респавна

    // столб
    ctx.fillStyle = '#6b4f3a';
    ctx.fillRect(cx - 8, groundY - 70, 16, 70);
    // перекладина-руки
    ctx.fillRect(cx - 35, groundY - 58, 70, 10);
    // голова-мешок
    ctx.fillStyle = '#caa472';
    ctx.beginPath();
    ctx.arc(cx, groundY - 80, 22, 0, 2 * Math.PI);
    ctx.fill();

    // вспышка попадания поверх
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash * 0.6;
      ctx.fillStyle = '#ff5050';
      ctx.beginPath();
      ctx.arc(cx, groundY - 80, 30, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();

    this.drawHpBar(ctx, cx, groundY - 120, dummy);
  }

  private drawHpBar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    y: number,
    dummy: Combatant,
  ): void {
    const w = 90;
    const h = 10;
    const x = cx - w / 2;
    const ratio = dummy.hp / dummy.maxHp;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = ratio > 0.3 ? '#4ad36b' : '#d34a4a';
    ctx.fillRect(x, y, w * ratio, h);
    ctx.fillStyle = '#fff';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${dummy.hp}/${dummy.maxHp}`, cx, y - 6);
    ctx.restore();
  }

  private drawFloaters(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = '#ffd23d';
      ctx.fillText(`-${f.value}`, f.x, f.y);
    }
    ctx.restore();
  }
}
