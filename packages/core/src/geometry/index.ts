// Примитивы геометрии ядра: точки, штрихи, длины, bbox, кластеризация.
export type { Point, Stroke, BoundingBox } from './types.js';
export { distance, pathLength, centroid, resample } from './strokes.js';
export { boundingBox, bboxContains, bboxGap } from './bbox.js';
export { clusterStrokes } from './cluster.js';
