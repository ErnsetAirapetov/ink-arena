import { describe, it, expect } from 'vitest';
import { buildSpell } from '../src/spells/spell-system';
import type { MatchResult } from '../src/recognition/recognizer';

const match = (id: string, name: string, score: number): MatchResult => ({
  glyph: { id, name, points: [] },
  score,
});

describe('buildSpell', () => {
  it('power = round(score * 100)', () => {
    const spell = buildSpell(match('fire', 'Огонь', 0.873), 800);
    expect(spell.power).toBe(87);
    expect(spell.elementId).toBe('fire');
    expect(spell.element).toBe('Огонь');
  });

  it('быстрый штрих → speed fast', () => {
    expect(buildSpell(match('fire', 'Огонь', 0.9), 300).speed).toBe('fast');
  });

  it('медленный штрих → speed slow', () => {
    expect(buildSpell(match('fire', 'Огонь', 0.9), 2000).speed).toBe('slow');
  });

  it('средний штрих → speed normal', () => {
    expect(buildSpell(match('fire', 'Огонь', 0.9), 900).speed).toBe('normal');
  });

  it('низкий score → success=false', () => {
    expect(buildSpell(match('fire', 'Огонь', 0.2), 800).success).toBe(false);
  });

  it('достаточный score → success=true', () => {
    expect(buildSpell(match('fire', 'Огонь', 0.6), 800).success).toBe(true);
  });
});
