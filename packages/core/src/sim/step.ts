import { config } from '../config.js';
import type { Element } from '../recognition/glyphs.js';
import type { CastOutcome } from '../spellcraft/types.js';
import { botAct } from './bot.js';
import { elementMatchup } from './pentagram.js';
import { nextFloat } from './rng.js';
import { freshRound, resetMageForRound } from './state.js';
import type {
  MageIndex,
  Projectile,
  RoundEndReason,
  Shield,
  SimEvent,
  SimState,
  StepResult,
  TickInputs,
} from './types.js';

// Ядро симуляции: чистая детерминированная редукция одного тика (Р38).
// step(state, inputs) → { state, events }. Номер тика живёт в state.tick
// (единственный источник — снапшот самодостаточен для реплея), поэтому
// отдельным аргументом не передаётся. Функция не мутирует вход: работает на
// глубокой копии и возвращает новый снапшот. Никаких Date/Math.random/DOM —
// только seeded RNG из состояния.
//
// Порядок тика (активная фаза): реген чернил → касты (бот выводит свой сам) →
// полёт снарядов и попадания → тик статусов → таймеры раунда и разрешение
// исхода (Р41). Между раундами — передышка, затем «чистый лист» (Р28).
export function step(state: SimState, inputs: TickInputs): StepResult {
  const s = cloneState(state);
  const events: SimEvent[] = [];
  const tick = s.tick;

  if (s.match.over) {
    // Матч завершён — состояние заморожено, тик дальше не идёт.
    return { state: s, events };
  }

  if (s.round.phase === 'over') {
    // Передышка между раундами (Р22); по её истечении — следующий раунд.
    s.round.intermissionTicks += 1;
    if (s.round.intermissionTicks >= s.match.rules.intermissionTicks) {
      startNextRound(s, events, tick);
    }
    s.tick = tick + 1;
    return { state: s, events };
  }

  // --- Активная фаза (active / sudden-death) ---

  // 1. Реген чернил (Р3): растёт со временем, зажат в [0, maxInk].
  for (const mage of s.mages) {
    mage.ink = clamp(mage.ink + mage.inkRegenPerTick, 0, mage.maxInk);
  }

  // 2. Касты. Порядок магов фиксирован (0, затем 1) — детерминизм. Бот выводит
  //    своё действие сам из bot-состояния, внешний вход для него игнорируется.
  for (let i = 0; i < 2; i++) {
    const mage = s.mages[i];
    const cast: CastOutcome | null = mage.bot ? botAct(mage.bot, s.rng, tick) : inputs[i].cast;
    if (cast) processCast(s, i as MageIndex, cast, events, tick);
  }

  // 3. Полёт снарядов и попадания (детерминированный порядок — по id).
  advanceProjectiles(s, events, tick);

  // 4. Тик статусов (уязвимость истекает).
  for (const mage of s.mages) {
    if (mage.vulnerability) {
      mage.vulnerability.remainingTicks -= 1;
      if (mage.vulnerability.remainingTicks <= 0) mage.vulnerability = null;
    }
  }

  // 5. Таймеры раунда и разрешение исхода (Р41).
  s.round.elapsedTicks += 1;
  if (s.round.phase === 'sudden-death') s.round.suddenDeathTicks += 1;
  resolveRound(s, events, tick);

  s.tick = tick + 1;
  return { state: s, events };
}

// --- Каст ---

function processCast(
  s: SimState,
  mageIdx: MageIndex,
  cast: CastOutcome,
  events: SimEvent[],
  tick: number,
): void {
  const mage = s.mages[mageIdx];

  // not-sent → ничего (Р27): круг не сработал, чернила целы.
  if (cast.kind === 'not-sent') return;

  // Осечка → сжигание чернил, без стана (Р29).
  if (cast.kind === 'misfire') {
    const burned = Math.min(mage.ink, cast.cost);
    mage.ink = clamp(mage.ink - burned, 0, mage.maxInk);
    events.push({ type: 'misfire', tick, mage: mageIdx, burnedInk: burned });
    return;
  }

  // Валидное заклинание. Без чернил — каст не проходит.
  if (mage.ink < cast.cost) {
    events.push({ type: 'cast-failed', tick, mage: mageIdx, reason: 'no-ink', cost: cast.cost });
    return;
  }
  mage.ink = clamp(mage.ink - cast.cost, 0, mage.maxInk);

  const spell = cast.spell;
  recordRead(s, mageIdx, spell);

  const action: 'attack' | 'shield' | 'heal' =
    spell.action === 'shield' ? 'shield' : spell.action === 'heal' ? 'heal' : 'attack';
  events.push({
    type: 'cast',
    tick,
    mage: mageIdx,
    element: spell.element,
    action,
    power: cast.power,
    cost: cast.cost,
  });

  if (action === 'shield') {
    // Щит: пул прочности со сродством стихии ядра (Р7/spellcraft.md).
    mage.shields.push({ affinity: spell.element, hp: cast.power });
    events.push({
      type: 'shield-raised',
      tick,
      mage: mageIdx,
      affinity: spell.element,
      amount: cast.power,
    });
  } else if (action === 'heal') {
    // Хил себе (Р25 спираль): сила от точности уже в power.
    const before = mage.hp;
    mage.hp = clamp(mage.hp + cast.power, 0, mage.maxHp);
    events.push({ type: 'heal', tick, mage: mageIdx, amount: mage.hp - before });
  } else {
    // Атака: снаряд. Баф уже усилил power (compositionBase), дебаф навесит
    // уязвимость при попадании. Время полёта — f(размер) (Р4).
    const appliesVulnerability = spell.modifiers.some((m) => m.verb === 'debuff');
    const ft = flightTicks(spell.coreSize);
    const proj: Projectile = {
      id: s.nextProjectileId++,
      owner: mageIdx,
      element: spell.element,
      damage: cast.power,
      appliesVulnerability,
      remainingFlightTicks: ft,
    };
    s.projectiles.push(proj);
    events.push({
      type: 'projectile-launched',
      tick,
      mage: mageIdx,
      projectileId: proj.id,
      element: spell.element,
      damage: cast.power,
      flightTicks: ft,
    });
  }
}

// Знание о сопернике (Р28): аккумулируем стихии и число кастов мага.
function recordRead(s: SimState, mageIdx: MageIndex, spell: { element: Element }): void {
  const read = s.match.reads[mageIdx];
  read.totalCasts += 1;
  read.elementCasts[spell.element] += 1;
}

// --- Снаряды и попадания ---

// Время полёта из f(размер) (Р4): крупнее ядро → медленнее летит (больше
// тиков). Монотонная степенная кривая, зажатая в [minTicks, maxTicks].
function flightTicks(coreSize: number): number {
  const f = config.sim.projectileFlight;
  if (coreSize <= 0) return f.minTicks;
  const raw = f.baseTicks * Math.pow(coreSize / f.refDiagonal, f.exponent);
  return clampInt(Math.round(raw), f.minTicks, f.maxTicks);
}

function advanceProjectiles(s: SimState, events: SimEvent[], tick: number): void {
  const survivors: Projectile[] = [];
  const ordered = [...s.projectiles].sort((a, b) => a.id - b.id);
  for (const p of ordered) {
    p.remainingFlightTicks -= 1;
    if (p.remainingFlightTicks > 0) {
      survivors.push(p);
      continue;
    }
    resolveHit(s, p, events, tick);
  }
  s.projectiles = survivors;
}

// Попадание: щиты поглощают пулом со сродством (пентаграмма Р24), остаток
// снимает HP с учётом уязвимости; дебаф-снаряд навешивает уязвимость.
function resolveHit(s: SimState, proj: Projectile, events: SimEvent[], tick: number): void {
  const targetIdx = (proj.owner === 0 ? 1 : 0) as MageIndex;
  const target = s.mages[targetIdx];
  const pent = config.sim.pentagram;

  let dmg = proj.damage;
  let absorbed = 0;
  const remainingShields: Shield[] = [];
  for (const shield of target.shields) {
    if (dmg <= 0) {
      remainingShields.push(shield);
      continue;
    }
    // Пентаграмма на щите: верный контр-щит (снаряд слаб против его стихии)
    // держит больше raw-урона на пункт пула; неверный — меньше (Р24, Т1).
    const m = elementMatchup(proj.element, shield.affinity);
    const absorbMult = m === 'weak' ? pent.strongMultiplier : m === 'strong' ? pent.weakMultiplier : 1;
    const capacity = shield.hp * absorbMult; // сколько raw-урона поглотит пул
    if (capacity >= dmg) {
      shield.hp -= dmg / absorbMult;
      absorbed += dmg;
      dmg = 0;
      remainingShields.push(shield);
    } else {
      absorbed += capacity;
      dmg -= capacity;
      shield.hp = 0;
      events.push({ type: 'shield-broken', tick, mage: targetIdx, affinity: shield.affinity });
    }
  }
  target.shields = remainingShields;

  let hpDamage = 0;
  if (dmg > 0) {
    // Уязвимость (дебаф) множит урон, дошедший до HP (Р25 `\`).
    if (target.vulnerability) dmg *= target.vulnerability.multiplier;
    hpDamage = dmg;
    target.hp = clamp(target.hp - hpDamage, 0, target.maxHp);
  }

  let appliedVulnerability = false;
  if (proj.appliesVulnerability) {
    target.vulnerability = {
      multiplier: config.sim.vulnerability.multiplier,
      remainingTicks: Math.round(config.sim.vulnerability.durationSec * config.sim.tickRate),
    };
    appliedVulnerability = true;
  }

  events.push({
    type: 'hit',
    tick,
    mage: targetIdx,
    projectileId: proj.id,
    element: proj.element,
    rawDamage: proj.damage,
    absorbed,
    hpDamage,
    appliedVulnerability,
  });
}

// --- Раунд и матч (Р41, Р28, Р22) ---

function resolveRound(s: SimState, events: SimEvent[], tick: number): void {
  const [a, b] = s.mages;
  const aDead = a.hp <= 0;
  const bDead = b.hp <= 0;

  // Обоюдный КО в один тик — ничья, очко никому (Р41).
  if (aDead && bDead) {
    endRound(s, events, tick, null, 'mutual-ko');
    return;
  }
  // Нокаут берёт раунд (Р41).
  if (aDead || bDead) {
    endRound(s, events, tick, (aDead ? 1 : 0) as MageIndex, 'knockout');
    return;
  }

  const rules = s.match.rules;
  if (s.round.phase === 'active') {
    if (s.round.elapsedTicks >= rules.roundDurationTicks) {
      if (a.hp !== b.hp) {
        // Истекло время — берёт больший остаток HP (Р41).
        endRound(s, events, tick, (a.hp > b.hp ? 0 : 1) as MageIndex, 'timeout-hp');
      } else {
        // Равный HP — внезапная смерть (Р41).
        s.round.phase = 'sudden-death';
        s.round.suddenDeathTicks = 0;
        events.push({ type: 'sudden-death', tick, round: s.round.index });
      }
    }
    return;
  }

  // sudden-death: любой чистый удар (разница HP) решает; кап — seeded RNG,
  // чтобы раунд всегда разрешался (Р41, инвариант).
  if (a.hp !== b.hp) {
    endRound(s, events, tick, (a.hp > b.hp ? 0 : 1) as MageIndex, 'sudden-death');
    return;
  }
  if (s.round.suddenDeathTicks >= rules.suddenDeathMaxTicks) {
    endRound(s, events, tick, (nextFloat(s.rng) < 0.5 ? 0 : 1) as MageIndex, 'sudden-death-rng');
  }
}

function endRound(
  s: SimState,
  events: SimEvent[],
  tick: number,
  winner: MageIndex | null,
  reason: RoundEndReason,
): void {
  s.round.phase = 'over';
  s.round.winner = winner;
  s.round.reason = reason;
  s.round.intermissionTicks = 0;
  s.projectiles = []; // снаряды в полёте снимаются на границе раунда
  s.match.roundsCompleted += 1;
  if (winner !== null) s.match.wins[winner] += 1;
  events.push({ type: 'round-end', tick, round: s.round.index, winner, reason });

  const need = s.match.rules.winsNeeded;
  if (s.match.wins[0] >= need || s.match.wins[1] >= need) {
    s.match.over = true;
    s.match.winner = (s.match.wins[0] >= need ? 0 : 1) as MageIndex;
    events.push({
      type: 'match-end',
      tick,
      winner: s.match.winner,
      wins: [s.match.wins[0], s.match.wins[1]],
    });
  }
}

// «Чистый лист» следующего раунда (Р28): HP/чернила/щиты/статусы к старту,
// снаряды сняты; счёт матча и reads сохраняются (они в match).
function startNextRound(s: SimState, events: SimEvent[], tick: number): void {
  const nextIndex = s.round.index + 1;
  const startTick = tick + 1; // раунд активен со следующего тика
  for (const mage of s.mages) resetMageForRound(mage, startTick);
  s.projectiles = [];
  s.round = freshRound(nextIndex);
  events.push({ type: 'round-start', tick, round: nextIndex });
}

// --- Утилиты ---

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function clampInt(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// Глубокая копия сериализуемого состояния — редукция чистая, вход не мутируется.
// structuredClone есть в среде исполнения ядра (Node ≥17, Vitest node); в lib
// ES2022 он не типизирован, поэтому объявляем глобаль явно.
declare function structuredClone<T>(value: T): T;

function cloneState(state: SimState): SimState {
  return structuredClone(state);
}
