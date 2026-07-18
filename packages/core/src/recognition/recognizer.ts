import { config } from '../config.js';
import type { Point, Stroke } from '../geometry/types.js';
import { greedyCloudMatch, matchDistanceToScore, normalize } from './dollar-p.js';
import { GLYPHS, type Glyph } from './glyphs.js';
import { idealStroke } from './shapes.js';

// Результат распознавания одного штриха как глифа словаря.
export interface RecognitionResult {
  readonly glyph: Glyph;
  // Точность 0..1 — «насколько ровно легла рука» (Р4), множитель силы.
  readonly accuracy: number;
}

interface Template {
  readonly glyph: Glyph;
  readonly cloud: Point[];
}

// Эталоны нормализуются один раз при загрузке модуля (чисто, детерминированно).
const N = config.recognition.resamplePoints;
const TEMPLATES: readonly Template[] = GLYPHS.map((glyph) => ({
  glyph,
  cloud: normalize(idealStroke(glyph), N),
}));

// Сопоставление штриха со всеми эталонами, отсортировано по убыванию точности.
// Пустой/вырожденный штрих → пустой список.
export function matchAll(stroke: Stroke): RecognitionResult[] {
  const cloud = normalize(stroke, N);
  if (cloud.length !== N) return [];
  return TEMPLATES.map((t) => ({
    glyph: t.glyph,
    accuracy: matchDistanceToScore(greedyCloudMatch(cloud, t.cloud)),
  })).sort((a, b) => b.accuracy - a.accuracy);
}

// Распознать штрих как глиф словаря. Возвращает лучший глиф с точностью либо
// null, если точность ниже порога (кандидат в осечку, решает spellcraft).
export function recognizeGlyph(stroke: Stroke): RecognitionResult | null {
  const best = matchAll(stroke)[0];
  if (!best || best.accuracy < config.recognition.minAccuracy) return null;
  return best;
}
