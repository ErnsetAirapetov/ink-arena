import { describe, it, expect } from 'vitest';
import { findCombo, COMBOS } from '../src/spells/combo';

describe('findCombo', () => {
  it('находит комбо в прямом порядке', () => {
    expect(findCombo('fire', 'air')?.id).toBe('firestorm');
  });

  it('находит комбо в обратном порядке', () => {
    expect(findCombo('air', 'fire')?.id).toBe('firestorm');
  });

  it('несочетающиеся глифы → null', () => {
    expect(findCombo('fire', 'water')).toBeNull();
  });

  it('лечащего барьера больше нет (вода+щит теперь стихийный щит)', () => {
    expect(COMBOS.find((c) => c.id === 'healing-barrier')).toBeUndefined();
    expect(findCombo('water', 'shield')).toBeNull();
  });
});
