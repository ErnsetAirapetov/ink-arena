import { config } from '../config.js';
import { pathLength } from '../geometry/strokes.js';
import type { Stroke } from '../geometry/types.js';

// Cost-модель чернил (Р21). Стоимость каста = база за каждый нарисованный
// глиф-штрих + плата за суммарную длину линий композиции. Замыкающий круг в
// стоимость НЕ входит (Р27) — на вход подаются уже только глиф-штрихи, без
// круга. Числа — только из config.spellcraft.cost (Р44), в формуле — ноль
// магических констант.
export function inkCost(glyphStrokes: readonly Stroke[]): number {
  const cfg = config.spellcraft.cost;
  const perGlyph = cfg.perGlyph * glyphStrokes.length;
  const perLength = cfg.perInkLength * glyphStrokes.reduce((sum, s) => sum + pathLength(s), 0);
  return perGlyph + perLength;
}
