import { CONFIG, type SpeedTier } from '../config';
import type { MatchResult } from '../recognition/recognizer';

export interface Spell {
  elementId: string;
  element: string;
  power: number;
  speed: SpeedTier;
  success: boolean;
}

function speedTier(durationMs: number): SpeedTier {
  if (durationMs < CONFIG.speed.fastBelowMs) return 'fast';
  if (durationMs > CONFIG.speed.slowAboveMs) return 'slow';
  return 'normal';
}

export function buildSpell(match: MatchResult, durationMs: number): Spell {
  return {
    elementId: match.glyph.id,
    element: match.glyph.name,
    power: Math.round(match.score * 100),
    speed: speedTier(durationMs),
    success: match.score >= CONFIG.minScore,
  };
}
