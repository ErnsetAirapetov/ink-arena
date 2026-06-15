import { CONFIG } from '../config';
import { findCombo } from './combo';
import type { MatchResult } from '../recognition/recognizer';

export type CastOutcome =
  | { kind: 'single'; id: string; name: string; power: number }
  | { kind: 'combo'; id: string; name: string; power: number }
  | { kind: 'fizzle'; reason: string };

export function resolveCast(results: MatchResult[]): CastOutcome {
  if (results.length === 0) return { kind: 'fizzle', reason: 'Ничего не нарисовано' };
  if (results.length > 2) return { kind: 'fizzle', reason: 'Пока не больше двух глифов' };
  if (results.some((r) => r.score < CONFIG.minScore)) {
    return { kind: 'fizzle', reason: 'Слишком неточно — рисуй чётче' };
  }

  if (results.length === 1) {
    const r = results[0];
    return { kind: 'single', id: r.glyph.id, name: r.glyph.name, power: Math.round(r.score * 100) };
  }

  const [a, b] = results;
  const combo = findCombo(a.glyph.id, b.glyph.id);
  if (!combo) return { kind: 'fizzle', reason: 'Эти глифы не сочетаются' };
  const power = Math.round(((a.score + b.score) / 2) * 100);
  return { kind: 'combo', id: combo.id, name: combo.name, power };
}
