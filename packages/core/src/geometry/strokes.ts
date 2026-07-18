import type { Point, Stroke } from './types.js';

// Евклидово расстояние между двумя точками.
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

// Длина ломаной штриха. Пустой штрих и штрих из одной точки — 0.
export function pathLength(stroke: Stroke): number {
  let sum = 0;
  for (let i = 1; i < stroke.length; i++) {
    sum += distance(stroke[i - 1], stroke[i]);
  }
  return sum;
}

// Центроид (среднее арифметическое координат). Пустой штрих не имеет центра.
export function centroid(stroke: Stroke): Point {
  if (stroke.length === 0) {
    throw new Error('centroid: пустой штрих');
  }
  let sx = 0;
  let sy = 0;
  for (const p of stroke) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / stroke.length, y: sy / stroke.length };
}

// Ресемплинг штриха до ровно n равноудалённых по длине пути точек
// (шаг $1/$P). Устойчив к неравномерной засэмплированности ввода.
//   - пустой штрих → пустой результат (n точек построить не из чего);
//   - штрих из одной точки или нулевой длины → n копий этой точки;
//   - n = 1 → первая точка.
export function resample(stroke: Stroke, n: number): Point[] {
  if (n < 1) {
    throw new Error('resample: n должно быть ≥ 1');
  }
  if (stroke.length === 0) {
    return [];
  }
  if (n === 1) {
    return [{ x: stroke[0].x, y: stroke[0].y }];
  }

  const total = pathLength(stroke);
  if (total === 0) {
    // Все точки совпадают — раздаём n копий, не деля на ноль.
    return Array.from({ length: n }, () => ({ x: stroke[0].x, y: stroke[0].y }));
  }

  const interval = total / (n - 1);
  const out: Point[] = [{ x: stroke[0].x, y: stroke[0].y }];
  let acc = 0;
  let prev = stroke[0];

  for (let i = 1; i < stroke.length; i++) {
    const curr = stroke[i];
    let segLen = distance(prev, curr);

    // Пока в текущем сегменте помещается очередная точка выборки — врезаем её.
    while (acc + segLen >= interval && out.length < n - 1) {
      const remain = interval - acc;
      const ratio = segLen === 0 ? 0 : remain / segLen;
      const np: Point = {
        x: prev.x + ratio * (curr.x - prev.x),
        y: prev.y + ratio * (curr.y - prev.y),
      };
      out.push(np);
      // Продолжаем от новой точки внутри того же сегмента.
      prev = np;
      segLen = distance(prev, curr);
      acc = 0;
    }
    acc += segLen;
    prev = curr;
  }

  // Из-за накопления погрешности последняя точка добивается явно.
  while (out.length < n) {
    out.push({ x: stroke[stroke.length - 1].x, y: stroke[stroke.length - 1].y });
  }
  return out;
}
