// Геометрические примитивы ядра. Чистая математика, без DOM (tsconfig core
// не подключает lib DOM — это гарантируется на уровне сборки).

// Точка штриха. t — таймстамп в тиках симуляции (Р38): время в ядре
// существует только как номер тика, никаких Date.now/performance.now.
// Для чистой геометрии t не обязателен.
export interface Point {
  readonly x: number;
  readonly y: number;
  readonly t?: number;
}

// Штрих — последовательность точек одного росчерка (палец опущен → поднят).
export type Stroke = readonly Point[];

// Осепараллельный ограничивающий прямоугольник.
export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
  // Диагональ — удобная мера «размера» штриха, инвариантная к форме.
  readonly diagonal: number;
}
