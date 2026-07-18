import { config } from '../config.js';
import { boundingBox, bboxContains, bboxGap } from './bbox.js';
import type { BoundingBox, Stroke } from './types.js';

// Кластеризация штрихов по близости и вложенности (примитив для грамматики
// «ядро и орбиты», Р26: принадлежность определяется близостью и вложенностью).
// Возвращает группы индексов исходных штрихов. Порядок групп и индексов
// внутри — детерминированный (по возрастанию).
//
// Два штриха связаны, если один bbox вложен в другой ИЛИ зазор между их bbox
// не превышает proximityRatio от большей диагонали пары. Связность —
// транзитивная (union-find).
export function clusterStrokes(
  strokes: readonly Stroke[],
  proximityRatio: number = config.geometry.clusterProximityRatio,
): number[][] {
  const n = strokes.length;
  if (n === 0) return [];

  const boxes: BoundingBox[] = strokes.map((s) => boundingBox(s));
  const parent = Array.from({ length: n }, (_, i) => i);

  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    // Сжатие путей.
    let cur = i;
    while (parent[cur] !== root) {
      const next = parent[cur];
      parent[cur] = root;
      cur = next;
    }
    return root;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (connected(boxes[i], boxes[j], proximityRatio)) union(i, j);
    }
  }

  // Собираем группы, сохраняя детерминированный порядок.
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const g = groups.get(root);
    if (g) g.push(i);
    else groups.set(root, [i]);
  }
  return [...groups.values()].sort((a, b) => a[0] - b[0]);
}

function connected(a: BoundingBox, b: BoundingBox, proximityRatio: number): boolean {
  if (bboxContains(a, b) || bboxContains(b, a)) return true;
  const threshold = proximityRatio * Math.max(a.diagonal, b.diagonal);
  return bboxGap(a, b) <= threshold;
}
