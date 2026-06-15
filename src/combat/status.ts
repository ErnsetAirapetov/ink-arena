import { CONFIG } from '../config';
import { affinity } from './elements';

export type EffectKind = 'burn' | 'vulnerable' | 'empower';

export type Status =
  | { kind: 'shield'; element: string | null; absorb: number; durationMs: number }
  | { kind: 'burn'; durationMs: number; dps: number }
  | { kind: 'vulnerable'; durationMs: number; extra: number }
  | { kind: 'empower'; durationMs: number; bonus: number };

export type ShieldStatus = Extract<Status, { kind: 'shield' }>;

export function shieldInfo(statuses: Status[]): ShieldStatus | null {
  return statuses.find((s): s is ShieldStatus => s.kind === 'shield') ?? null;
}

export function hasShield(statuses: Status[]): boolean {
  return shieldInfo(statuses) !== null;
}

/** Добавить/стакнуть щит: прочность и время суммируются (с кэпами), стихия — последняя. */
export function addShield(
  statuses: Status[],
  element: string | null,
  absorb: number,
  durationMs: number,
): Status[] {
  const existing = shieldInfo(statuses);
  const others = statuses.filter((s) => s.kind !== 'shield');
  const base = existing ?? { absorb: 0, durationMs: 0 };
  return [
    ...others,
    {
      kind: 'shield',
      element,
      absorb: Math.min(CONFIG.combat.maxShieldAbsorb, base.absorb + absorb),
      durationMs: Math.min(CONFIG.combat.maxShieldMs, base.durationMs + durationMs),
    },
  ];
}

/** Уменьшить длительности, снять истёкшие/опустошённые статусы. */
export function tickStatuses(statuses: Status[], dtMs: number): Status[] {
  return statuses
    .map((s) => ({ ...s, durationMs: s.durationMs - dtMs }))
    .filter((s) => s.durationMs > 0 && (s.kind !== 'shield' || s.absorb > 0));
}

/** Применить входящий урон через статусы: щит со сродством гасит из пула. */
export function absorbIncoming(
  statuses: Status[],
  raw: number,
  attackElement: string,
): { statuses: Status[]; hpDamage: number } {
  const shield = shieldInfo(statuses);
  if (!shield) return { statuses, hpDamage: Math.round(raw) };

  const adjusted = Math.round(raw / affinity(shield.element ?? '', attackElement));
  const absorbed = Math.min(shield.absorb, adjusted);
  const remaining = shield.absorb - absorbed;
  const hpDamage = adjusted - absorbed;

  const others = statuses.filter((s) => s.kind !== 'shield');
  const next = remaining > 0 ? [...others, { ...shield, absorb: remaining }] : others;
  return { statuses: next, hpDamage };
}
