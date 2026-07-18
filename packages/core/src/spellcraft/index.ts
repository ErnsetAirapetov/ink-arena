// Грамматика заклинаний «ядро и орбиты» (Р26): парсер композиции, cost-модель
// чернил (Р21) и формула силы (Р4, Р30). Источник правды — game/spellcraft.md.
export type {
  ActionForm,
  VerbRole,
  Modifier,
  Spell,
  MisfireReason,
  NotSentReason,
  CastOutcome,
} from './types.js';
export { parseComposition } from './parse.js';
export { inkCost } from './cost.js';
export { sizeFactor, compositionBase, castAccuracy, spellPower } from './power.js';
export { circleGeom, classifyGlyph, isCoreCentered, type CircleGeom, type RingZone } from './boundary.js';
