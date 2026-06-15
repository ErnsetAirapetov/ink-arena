import { boundingBox, boxGap } from '../geometry';
import type { Stroke } from '../drawing/stroke';

/**
 * Группирует линии по пространственной близости (single-link).
 * Две линии в одной группе, если зазор между их боксами < gapPx.
 */
export function clusterStrokes(strokes: Stroke[], gapPx: number): Stroke[][] {
  const boxes = strokes.map((s) => boundingBox(s.points));
  const parent = strokes.map((_, i) => i);

  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (i: number, j: number): void => {
    parent[find(i)] = find(j);
  };

  for (let i = 0; i < strokes.length; i++) {
    for (let j = i + 1; j < strokes.length; j++) {
      if (boxGap(boxes[i], boxes[j]) < gapPx) union(i, j);
    }
  }

  const groups = new Map<number, Stroke[]>();
  strokes.forEach((s, i) => {
    const root = find(i);
    const group = groups.get(root);
    if (group) group.push(s);
    else groups.set(root, [s]);
  });
  return [...groups.values()];
}
