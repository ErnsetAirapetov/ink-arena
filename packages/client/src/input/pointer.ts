// Сбор штрихов через pointer events (docs/tech/architecture.md «input»,
// Р13 «палец прежде мыши»). Touch/мышь/стилус обрабатываются единым API
// PointerEvent — курсор заменяет палец один в один. Рисование активно только
// в зоне блокнота и только пока предикат isActive() истинен (в бою).
//
// Визуальный модуль — проверяется руками в браузире, автотестов нет
// (соглашение CLAUDE.md).
import { pointInRect, type Layout, type Vec2 } from '../layout';

export interface PointerInputCallbacks {
  // Начат новый штрих (палец опущен в блокноте).
  onStrokeStart(p: Vec2): void;
  // Очередная точка штриха.
  onStrokePoint(p: Vec2): void;
  // Штрих завершён (палец поднят) — передаёт накопленные точки.
  onStrokeEnd(): void;
}

export interface PointerInputOptions {
  canvas: HTMLCanvasElement;
  getLayout(): Layout;
  // Рисование разрешено только когда true (иначе касание игнорируется — экраны
  // старта/результата не должны чертить).
  isActive(): boolean;
  callbacks: PointerInputCallbacks;
}

export function attachPointerInput(opts: PointerInputOptions): void {
  const { canvas, getLayout, isActive, callbacks } = opts;
  // Идёт ли сейчас штрих и каким указателем — второй палец игнорируем, чтобы
  // мультитач не рвал линию.
  let activePointerId: number | null = null;

  function toCanvasPoint(e: PointerEvent): Vec2 {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!isActive() || activePointerId !== null) return;
    const p = toCanvasPoint(e);
    // Рисуем только внутри блокнота (Р10): арену рука не заслоняет.
    if (!pointInRect(p, getLayout().notebook)) return;
    activePointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
    callbacks.onStrokeStart(p);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activePointerId) return;
    e.preventDefault();
    callbacks.onStrokePoint(toCanvasPoint(e));
  });

  function endStroke(e: PointerEvent): void {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    callbacks.onStrokeEnd();
  }

  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
}
