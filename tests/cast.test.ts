import { describe, it, expect } from 'vitest';
import { resolveCast } from '../src/spells/cast';
import type { MatchResult } from '../src/recognition/recognizer';

const m = (id: string, name: string, score: number): MatchResult => ({
  glyph: { id, name, points: [] },
  score,
});

describe('resolveCast', () => {
  it('ничего не нарисовано → осечка', () => {
    expect(resolveCast([]).kind).toBe('fizzle');
  });

  it('больше двух глифов → осечка', () => {
    const r = resolveCast([m('fire', 'Огонь', 0.9), m('water', 'Вода', 0.9), m('air', 'Воздух', 0.9)]);
    expect(r.kind).toBe('fizzle');
  });

  it('один точный глиф → одиночное заклинание с power', () => {
    const r = resolveCast([m('fire', 'Огонь', 0.87)]);
    expect(r).toEqual({ kind: 'single', id: 'fire', name: 'Огонь', power: 87 });
  });

  it('один неточный глиф → осечка', () => {
    expect(resolveCast([m('fire', 'Огонь', 0.2)]).kind).toBe('fizzle');
  });

  it('два сочетающихся глифа → комбо со средней силой', () => {
    const r = resolveCast([m('fire', 'Огонь', 0.8), m('air', 'Воздух', 0.6)]);
    expect(r).toEqual({ kind: 'combo', id: 'firestorm', name: 'Огненный вихрь', power: 70 });
  });

  it('комбо порядок-независимо', () => {
    const r = resolveCast([m('air', 'Воздух', 0.8), m('fire', 'Огонь', 0.8)]);
    expect(r.kind).toBe('combo');
    if (r.kind === 'combo') expect(r.id).toBe('firestorm');
  });

  it('два несочетающихся глифа → осечка', () => {
    expect(resolveCast([m('fire', 'Огонь', 0.9), m('water', 'Вода', 0.9)]).kind).toBe('fizzle');
  });

  it('два глифа, один неточный → осечка', () => {
    expect(resolveCast([m('fire', 'Огонь', 0.9), m('air', 'Воздух', 0.2)]).kind).toBe('fizzle');
  });
});
