import { ELEMENTS } from './elements';
import { CONFIG } from '../config';

type Phase = 'telegraph' | 'cooldown';

export interface DummyAi {
  phase: Phase;
  timer: number; // остаток мс в текущей фазе
  elementIndex: number; // индекс стихии текущей/следующей атаки
}

export function createDummyAi(): DummyAi {
  return { phase: 'telegraph', timer: CONFIG.combat.telegraphMs, elementIndex: 0 };
}

export interface DummyTick {
  ai: DummyAi;
  fire: { element: string } | null;
}

/** Стихия, которая сейчас телеграфируется (null — пауза). */
export function telegraphElement(ai: DummyAi): string | null {
  return ai.phase === 'telegraph' ? ELEMENTS[ai.elementIndex] : null;
}

export function tickDummyAi(ai: DummyAi, dtMs: number): DummyTick {
  const timer = ai.timer - dtMs;
  if (timer > 0) return { ai: { ...ai, timer }, fire: null };

  if (ai.phase === 'telegraph') {
    const element = ELEMENTS[ai.elementIndex];
    return {
      ai: { phase: 'cooldown', timer: CONFIG.combat.dummyAttackIntervalMs, elementIndex: ai.elementIndex },
      fire: { element },
    };
  }

  const nextIndex = (ai.elementIndex + 1) % ELEMENTS.length;
  return {
    ai: { phase: 'telegraph', timer: CONFIG.combat.telegraphMs, elementIndex: nextIndex },
    fire: null,
  };
}
