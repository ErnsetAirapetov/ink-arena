import { describe, it, expect } from 'vitest';
import { parseSpell } from '../src/spells/spell-types';
import type { MatchResult } from '../src/recognition/recognizer';

const m = (id: string, name: string, score: number): MatchResult => ({
  glyph: { id, name, points: [] },
  score,
});

describe('parseSpell', () => {
  it('ничего → осечка', () => {
    expect(parseSpell([]).kind).toBe('fizzle');
  });

  it('больше двух → осечка', () => {
    expect(parseSpell([m('fire', 'Огонь', 0.9), m('water', 'Вода', 0.9), m('air', 'Воздух', 0.9)]).kind).toBe('fizzle');
  });

  it('ниже порога → осечка', () => {
    expect(parseSpell([m('fire', 'Огонь', 0.2)]).kind).toBe('fizzle');
  });

  it('одна стихия → атака', () => {
    expect(parseSpell([m('fire', 'Огонь', 0.87)])).toEqual({
      kind: 'attack', element: 'fire', name: 'Огонь', power: 87,
    });
  });

  it('один щит → базовый щит без стихии', () => {
    expect(parseSpell([m('shield', 'Щит', 0.9)])).toEqual({
      kind: 'shield', element: null, name: 'Щит', power: 90,
    });
  });

  it('щит + стихия → стихийный щит (в любом порядке)', () => {
    const r = parseSpell([m('shield', 'Щит', 0.8), m('water', 'Вода', 0.6)]);
    expect(r).toEqual({ kind: 'shield', element: 'water', name: 'Щит: Вода', power: 70 });
    const r2 = parseSpell([m('water', 'Вода', 0.6), m('shield', 'Щит', 0.8)]);
    expect(r2.kind).toBe('shield');
    if (r2.kind === 'shield') expect(r2.element).toBe('water');
  });

  it('две стихии-комбо → комбо со сродством', () => {
    const r = parseSpell([m('fire', 'Огонь', 0.8), m('air', 'Воздух', 0.6)]);
    expect(r).toEqual({ kind: 'combo', id: 'firestorm', name: 'Огненный вихрь', power: 105 });
  });

  it('две несочетающиеся стихии → осечка', () => {
    expect(parseSpell([m('fire', 'Огонь', 0.9), m('water', 'Вода', 0.9)]).kind).toBe('fizzle');
  });

  it('два щита → осечка', () => {
    expect(parseSpell([m('shield', 'Щит', 0.9), m('shield', 'Щит', 0.9)]).kind).toBe('fizzle');
  });
});
