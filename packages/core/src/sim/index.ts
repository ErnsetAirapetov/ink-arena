// Симуляция боя (Р22/Р28/Р41, game/combat.md): детерминированное ядро
// step(state, inputs) → { state, events }, модель раунда/матча и бот-манекен
// ПвЕ. Всё состояние сериализуемо (Р38). Источник правды — game/combat.md.
export { step } from './step.js';
export { createMatch, resetMageForRound, freshRound } from './state.js';
export type { MatchOptions, MageOptions, BotOptions, RulesOptions } from './state.js';
export { botAct } from './bot.js';
export { CORPUS, corpusCast, type CorpusSpellId, type CorpusEntry } from './corpus.js';
export { BEATS, elementMatchup, type Matchup } from './pentagram.js';
export {
  makeRng,
  nextUint32,
  nextFloat,
  nextInt,
  nextIntInclusive,
  type Rng,
} from './rng.js';
export type {
  SimState,
  SimEvent,
  StepResult,
  TickInputs,
  MageInput,
  MageIndex,
  MageState,
  BotState,
  Shield,
  Vulnerability,
  Projectile,
  RoundState,
  RoundPhase,
  RoundEndReason,
  MatchState,
  SimRules,
  OpponentRead,
} from './types.js';
