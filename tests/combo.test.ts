import { describe, it, expect } from 'vitest';
import { ComboTracker, COMBOS } from '../src/spells/combo';

describe('ComboTracker', () => {
  it('два совместимых глифа в окне → комбо', () => {
    const t = new ComboTracker();
    expect(t.push('fire', 0).type).toBe('single');
    const r = t.push('arrow', 1000);
    expect(r.type).toBe('combo');
    if (r.type === 'combo') expect(r.combo.id).toBe('fireball');
  });

  it('второй глиф вне окна → одиночный, не комбо', () => {
    const t = new ComboTracker();
    t.push('fire', 0);
    const r = t.push('arrow', 5000);
    expect(r.type).toBe('single');
  });

  it('несочетающиеся глифы → одиночный', () => {
    const t = new ComboTracker();
    t.push('fire', 0);
    const r = t.push('fire', 500);
    expect(r.type).toBe('single');
  });

  it('таблица комбо содержит вода+щит', () => {
    const found = COMBOS.find((c) => c.id === 'healing-barrier');
    expect(found).toBeDefined();
    expect(found!.parts).toEqual(['water', 'shield']);
  });

  it('после комбо буфер сбрасывается', () => {
    const t = new ComboTracker();
    t.push('fire', 0);
    t.push('arrow', 1000); // combo
    const r = t.push('arrow', 1200); // не должно склеиться с прошлым
    expect(r.type).toBe('single');
  });
});
