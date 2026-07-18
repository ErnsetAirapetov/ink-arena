// Общие типы данных рендера, которые готовит game.ts и потребляют draw-функции.
import type { Element, MageIndex } from '@inkarena/core';
import type { Vec2 } from '../layout';

// Штрих, нарисованный игроком в блокноте, с таймером вспышки «распознан» (Р31).
export interface DrawnStroke {
  points: Vec2[];
  // performance.now(), до которого держится подсветка контура (0 — не горит).
  recognizedUntil: number;
}

// Снаряд к отрисовке: экранная позиция уже посчитана интерполяцией в game.ts.
export interface RenderProjectile {
  pos: Vec2;
  element: Element;
  owner: MageIndex;
}

// Вспышка попадания на цели.
export interface HitFlash {
  mage: MageIndex;
  // performance.now(), до которого держится вспышка.
  until: number;
}
