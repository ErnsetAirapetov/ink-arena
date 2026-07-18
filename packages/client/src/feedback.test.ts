import { describe, expect, it } from 'vitest';
import type { CastOutcome } from '@inkarena/core';
import { castFeedback } from './feedback';

describe('castFeedback', () => {
  it('валидное заклинание — тон success', () => {
    const spell = {
      element: 'fire' as const,
      action: 'attack' as const,
      modifiers: [],
      coreAccuracy: 0.9,
      coreSize: 120,
    };
    const outcome: CastOutcome = { kind: 'spell', spell, cost: 8, power: 12 };
    expect(castFeedback(outcome).tone).toBe('success');
  });

  it('осечка подаётся как своя ошибка руки — «я криво нарисовал», тон misfire', () => {
    const outcome: CastOutcome = { kind: 'misfire', reason: 'two-elements', cost: 8 };
    const fb = castFeedback(outcome);
    expect(fb.tone).toBe('misfire');
    expect(fb.message.toLowerCase()).toContain('криво');
  });

  it('не отправлено (круг не охватил) — мягкая подсказка про круг, тон hint', () => {
    const outcome: CastOutcome = { kind: 'not-sent', reason: 'circle-not-enclosing' };
    const fb = castFeedback(outcome);
    expect(fb.tone).toBe('hint');
    expect(fb.message.toLowerCase()).toContain('круг');
  });

  it('не отправлено (пустая композиция) — подсказка нарисовать глиф, тон hint', () => {
    const outcome: CastOutcome = { kind: 'not-sent', reason: 'empty-composition' };
    const fb = castFeedback(outcome);
    expect(fb.tone).toBe('hint');
    expect(fb.message.length).toBeGreaterThan(0);
  });
});
