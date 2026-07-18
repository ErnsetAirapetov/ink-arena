import { describe, expect, it } from 'vitest';
import { makeRng, nextFloat, nextInt, nextIntInclusive, nextUint32 } from './rng.js';

describe('seeded RNG (Р38)', () => {
  it('одинаковый сид даёт одинаковую последовательность', () => {
    const a = makeRng(12345);
    const b = makeRng(12345);
    const seqA = Array.from({ length: 20 }, () => nextUint32(a));
    const seqB = Array.from({ length: 20 }, () => nextUint32(b));
    expect(seqA).toEqual(seqB);
  });

  it('разные сиды расходятся', () => {
    const a = makeRng(1);
    const b = makeRng(2);
    expect(nextUint32(a)).not.toEqual(nextUint32(b));
  });

  it('nextFloat лежит в [0, 1)', () => {
    const r = makeRng(999);
    for (let i = 0; i < 1000; i++) {
      const v = nextFloat(r);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt лежит в [0, maxExclusive)', () => {
    const r = makeRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = nextInt(r, 5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('nextInt(0) и отрицательный диапазон дают 0', () => {
    const r = makeRng(3);
    expect(nextInt(r, 0)).toBe(0);
    expect(nextInt(r, -4)).toBe(0);
  });

  it('nextIntInclusive покрывает границы включительно', () => {
    const r = makeRng(42);
    let sawMin = false;
    let sawMax = false;
    for (let i = 0; i < 2000; i++) {
      const v = nextIntInclusive(r, 2, 4);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(4);
      if (v === 2) sawMin = true;
      if (v === 4) sawMax = true;
    }
    expect(sawMin).toBe(true);
    expect(sawMax).toBe(true);
  });

  it('состояние сериализуемо и восстанавливается без потерь', () => {
    const r = makeRng(555);
    nextUint32(r);
    nextUint32(r);
    const snapshot = JSON.parse(JSON.stringify(r));
    const restored = { state: snapshot.state };
    expect(nextUint32(restored)).toEqual(nextUint32(r));
  });
});
