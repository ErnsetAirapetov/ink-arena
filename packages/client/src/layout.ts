// Раскладка экрана боя (docs/game/ux.md «Компоновка экрана боя», Р10): арена
// сверху, блокнот мага — нижняя полоса во всю ширину. Чистая функция от
// размеров канваса; все доли берутся из clientConfig, магии в коде нет.
import { clientConfig } from './config';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  width: number;
  height: number;
  // Верхняя зона — бой (фигуры магов, снаряды, HUD).
  arena: Rect;
  // Нижняя зона — холст рисования во всю ширину.
  notebook: Rect;
  // Экранные позиции фигур: [игрок (маг 0), соперник (маг 1)].
  mages: [Vec2, Vec2];
}

export function computeLayout(width: number, height: number): Layout {
  const arenaH = height * clientConfig.layout.arenaHeightRatio;
  const arena: Rect = { x: 0, y: 0, w: width, h: arenaH };
  const notebook: Rect = { x: 0, y: arenaH, w: width, h: height - arenaH };

  const margin = arenaH * clientConfig.layout.mageMarginRatio;
  // Соперник — вверху арены, игрок — внизу (у блокнота): снаряд летит по
  // вертикали через центр и хорошо телеграфирует себя (Р22).
  const enemy: Vec2 = { x: width / 2, y: margin };
  const player: Vec2 = { x: width / 2, y: arenaH - margin };

  return { width, height, arena, notebook, mages: [player, enemy] };
}

export function pointInRect(p: Vec2, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}
