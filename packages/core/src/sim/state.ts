import { config } from '../config.js';
import { ELEMENTS, type Element } from '../recognition/glyphs.js';
import type { CorpusSpellId } from './corpus.js';
import { makeRng } from './rng.js';
import type {
  BotState,
  MageState,
  MatchState,
  OpponentRead,
  RoundState,
  SimRules,
  SimState,
} from './types.js';

// Округление секунд конфига в тики (единая модель времени — тик).
function sec(seconds: number): number {
  return Math.round(seconds * config.sim.tickRate);
}

// Пустое «знание о сопернике» (Р28).
function emptyRead(): OpponentRead {
  const elementCasts = {} as Record<Element, number>;
  for (const e of ELEMENTS) elementCasts[e] = 0;
  return { totalCasts: 0, elementCasts };
}

// Настройка бота-манекена по difficulty из config (или переопределению).
export interface BotOptions {
  readonly rotation?: readonly CorpusSpellId[];
  readonly intervalTicks?: number;
  readonly jitterTicks?: number;
  readonly firstCastDelayTicks?: number;
}

function makeBot(startTick: number, opts: BotOptions): BotState {
  const bot = config.sim.bot;
  const intervalTicks = opts.intervalTicks ?? sec(bot.castIntervalSec);
  const jitterTicks = opts.jitterTicks ?? sec(bot.castJitterSec);
  const firstDelay = opts.firstCastDelayTicks ?? sec(bot.firstCastDelaySec);
  return {
    rotation: opts.rotation ?? bot.rotation,
    rotationIndex: 0,
    nextCastTick: startTick + firstDelay,
    intervalTicks,
    jitterTicks,
    firstCastDelayTicks: firstDelay,
  };
}

// Переопределения одного мага для сборки нестандартных стартов в тестах.
export interface MageOptions {
  readonly maxHp?: number;
  readonly maxInk?: number;
  readonly startInk?: number;
  readonly inkRegenPerTick?: number;
  // Если задано — маг управляется ботом-манекеном.
  readonly bot?: BotOptions;
}

function makeMage(startTick: number, opts: MageOptions): MageState {
  const m = config.sim.mage;
  const maxHp = opts.maxHp ?? m.maxHp;
  const maxInk = opts.maxInk ?? m.maxInk;
  return {
    hp: maxHp,
    maxHp,
    ink: opts.startInk ?? maxInk,
    maxInk,
    inkRegenPerTick: opts.inkRegenPerTick ?? m.inkRegenPerTick,
    shields: [],
    vulnerability: null,
    bot: opts.bot ? makeBot(startTick, opts.bot) : null,
  };
}

// Правила матча из config.sim с опциональными переопределениями (тесты).
export interface RulesOptions {
  readonly winsNeeded?: number;
  readonly roundDurationTicks?: number;
  readonly suddenDeathMaxTicks?: number;
  readonly intermissionTicks?: number;
}

function makeRules(opts: RulesOptions): SimRules {
  const r = config.sim.round;
  return {
    winsNeeded: opts.winsNeeded ?? config.sim.match.winsNeeded,
    roundDurationTicks: opts.roundDurationTicks ?? sec(r.durationSec),
    suddenDeathMaxTicks: opts.suddenDeathMaxTicks ?? sec(r.suddenDeathMaxSec),
    intermissionTicks: opts.intermissionTicks ?? sec(r.intermissionSec),
  };
}

export function freshRound(index: number): RoundState {
  return {
    index,
    phase: 'active',
    elapsedTicks: 0,
    suddenDeathTicks: 0,
    intermissionTicks: 0,
    winner: null,
    reason: null,
  };
}

// Опции создания матча. По умолчанию — bo3, PvE (маг 1 — бот), сид 1.
export interface MatchOptions {
  readonly rngSeed?: number;
  readonly rules?: RulesOptions;
  // Переопределения для двух магов. По умолчанию маг 0 — игрок, маг 1 — бот.
  readonly mages?: readonly [MageOptions, MageOptions];
}

// Создать начальное состояние матча из config.sim (+ overrides). Единственная
// точка, где sim читает config; step дальше работает только по состоянию.
export function createMatch(opts: MatchOptions = {}): SimState {
  const startTick = 0;
  const mageOpts: readonly [MageOptions, MageOptions] = opts.mages ?? [{}, { bot: {} }];
  const mages: [MageState, MageState] = [
    makeMage(startTick, mageOpts[0]),
    makeMage(startTick, mageOpts[1]),
  ];
  const match: MatchState = {
    rules: makeRules(opts.rules ?? {}),
    wins: [0, 0],
    roundsCompleted: 0,
    over: false,
    winner: null,
    reads: [emptyRead(), emptyRead()],
  };
  return {
    tick: startTick,
    rng: makeRng(opts.rngSeed ?? 1),
    mages,
    projectiles: [],
    round: freshRound(0),
    match,
    nextProjectileId: 1,
  };
}

// «Чистый лист» между раундами (Р28): HP/чернила/щиты/статусы сбрасываются к
// старту, снаряды снимаются, бот перезаводит расписание от текущего тика.
// Переносятся только счёт матча и reads — они живут в match и не трогаются.
export function resetMageForRound(mage: MageState, startTick: number): void {
  mage.hp = mage.maxHp;
  mage.ink = mage.maxInk;
  mage.shields = [];
  mage.vulnerability = null;
  if (mage.bot) {
    mage.bot.rotationIndex = 0;
    mage.bot.nextCastTick = startTick + mage.bot.firstCastDelayTicks;
  }
}
