import { CONFIG } from '../config';
import { findCombo } from './combo';
import { affinity, ELEMENTS } from '../combat/elements';
import type { MatchResult } from '../recognition/recognizer';

export type Spell =
  | { kind: 'attack'; element: string; name: string; power: number }
  | { kind: 'combo'; id: string; name: string; power: number }
  | { kind: 'shield'; element: string | null; name: string; power: number }
  | { kind: 'fizzle'; reason: string };

const SHIELD_ID = 'shield';

function isElementId(id: string): boolean {
  return (ELEMENTS as readonly string[]).includes(id);
}

export function parseSpell(results: MatchResult[]): Spell {
  if (results.length === 0) return { kind: 'fizzle', reason: 'Ничего не нарисовано' };
  if (results.length > 2) return { kind: 'fizzle', reason: 'Пока не больше двух глифов' };
  if (results.some((r) => r.score < CONFIG.minScore)) {
    return { kind: 'fizzle', reason: 'Слишком неточно — рисуй чётче' };
  }

  if (results.length === 1) {
    const r = results[0];
    const power = Math.round(r.score * 100);
    if (r.glyph.id === SHIELD_ID) return { kind: 'shield', element: null, name: 'Щит', power };
    return { kind: 'attack', element: r.glyph.id, name: r.glyph.name, power };
  }

  const [a, b] = results;
  const aShield = a.glyph.id === SHIELD_ID;
  const bShield = b.glyph.id === SHIELD_ID;
  const power2 = Math.round(((a.score + b.score) / 2) * 100);

  if (aShield && bShield) return { kind: 'fizzle', reason: 'Два щита не сочетаются' };

  if (aShield || bShield) {
    const elem = aShield ? b : a;
    if (!isElementId(elem.glyph.id)) return { kind: 'fizzle', reason: 'Эти глифы не сочетаются' };
    return { kind: 'shield', element: elem.glyph.id, name: `Щит: ${elem.glyph.name}`, power: power2 };
  }

  const combo = findCombo(a.glyph.id, b.glyph.id);
  if (!combo) return { kind: 'fizzle', reason: 'Эти глифы не сочетаются' };
  const mult = affinity(combo.parts[0], combo.parts[1]);
  return { kind: 'combo', id: combo.id, name: combo.name, power: Math.round(power2 * mult) };
}
