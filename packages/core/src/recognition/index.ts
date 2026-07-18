// Распознавание глифов: $P point-cloud recognizer + детекция круга (Р27).
export type { Element, Verb, Glyph } from './glyphs.js';
export { ELEMENTS, VERBS, GLYPHS } from './glyphs.js';
export { idealStroke } from './shapes.js';
export { normalize, greedyCloudMatch, matchDistanceToScore } from './dollar-p.js';
export { recognizeGlyph, matchAll, type RecognitionResult } from './recognizer.js';
export { isClosingCircle } from './circle.js';
