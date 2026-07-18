// Сериализуемое состояние симуляции боя и события тика (Р38). Всё — plain-
// объекты (числа, строки, массивы, вложенные объекты; null вместо undefined),
// чтобы JSON-снапшот был round-trip без потерь: фундамент реплеев и сервера.

import type { Element } from '../recognition/glyphs.js';
import type { CastOutcome } from '../spellcraft/types.js';
import type { CorpusSpellId } from './corpus.js';
import type { Rng } from './rng.js';

// --- Вход step ---

// Действие одного мага в тик: заявленный каст (уже разобранный CastOutcome из
// recognition→spellcraft) или ничего. Для мага-бота вход игнорируется — его
// действие step выводит сам из bot-состояния.
export interface MageInput {
  readonly cast: CastOutcome | null;
}

// Вход step на тик: по одному действию на мага.
export type TickInputs = readonly [MageInput, MageInput];

// Индекс мага на арене.
export type MageIndex = 0 | 1;

// --- Состояние ---

// Активный щит: пул прочности со стихийным сродством (Р7/spellcraft.md). Пул
// поглощает урон; сродство участвует в пентаграмме (Р24).
export interface Shield {
  readonly affinity: Element;
  hp: number;
}

// Статус уязвимости от дебафа (Р25 `\`): множитель входящего урона на время.
export interface Vulnerability {
  multiplier: number;
  remainingTicks: number;
}

// Настройка бота-манекена (Р32): расписание кастов из корпуса. Хранится в
// состоянии → детерминизм и сериализуемость.
export interface BotState {
  readonly rotation: readonly CorpusSpellId[];
  rotationIndex: number;
  // Абсолютный тик следующего каста.
  nextCastTick: number;
  intervalTicks: number;
  jitterTicks: number;
  // Пауза перед первым кастом раунда — для «чистого листа» между раундами.
  firstCastDelayTicks: number;
}

// Маг: ресурсы, статусы, опциональный бот. maxHp/maxInk/реген лежат в маге —
// «чистый лист» между раундами восстанавливает из них (Р28), а тесты могут
// собрать асимметричные стартовые условия.
export interface MageState {
  hp: number;
  maxHp: number;
  ink: number;
  maxInk: number;
  inkRegenPerTick: number;
  shields: Shield[];
  vulnerability: Vulnerability | null;
  bot: BotState | null;
}

// Снаряд в полёте. Позиции нет: в абстрактном ядре полёт — таймер (f(размер),
// Р4), попадание разрешается по его истечении в оппонента. damage уже включает
// точность, размер и вклад бафов (формула силы, spellcraft.md#формула-силы).
export interface Projectile {
  readonly id: number;
  readonly owner: MageIndex;
  readonly element: Element;
  damage: number;
  // Дебаф-augment: при попадании навесить уязвимость (Р25 `\`).
  readonly appliesVulnerability: boolean;
  remainingFlightTicks: number;
}

// Причина завершения раунда (Р41).
export type RoundEndReason =
  // HP оппонента упал до нуля.
  | 'knockout'
  // Истекло время — победил больший остаток HP (Р41).
  | 'timeout-hp'
  // Внезапная смерть: чистый удой решил (Р41).
  | 'sudden-death'
  // Внезапная смерть уперлась в кап — разрешено seeded RNG (Р41, инвариант).
  | 'sudden-death-rng'
  // Обоюдный КО в один тик — ничья, очко никому (Р41).
  | 'mutual-ko';

export type RoundPhase = 'active' | 'sudden-death' | 'over';

export interface RoundState {
  // 0-based номер раунда в матче.
  index: number;
  phase: RoundPhase;
  // Тиков прошло с начала раунда (для таймера и внезапной смерти).
  elapsedTicks: number;
  // Тиков идёт фаза внезапной смерти (кап — rules.suddenDeathMaxTicks).
  suddenDeathTicks: number;
  // Тиков идёт передышка после конца раунда (кап — rules.intermissionTicks).
  intermissionTicks: number;
  // Итог раунда (пока phase !== 'over' — null). winner null = ничья.
  winner: MageIndex | null;
  reason: RoundEndReason | null;
}

// Агрегированное «знание о сопернике» (Р28): что маг показал за матч. Живёт
// через границы раундов; минимальная структура, вид клиенту не диктует.
export interface OpponentRead {
  totalCasts: number;
  elementCasts: Record<Element, number>;
}

// Правила матча/раунда — запечены createMatch из config.sim (или overrides).
// step читает тайминги отсюда, а не из config → тесты варьируют без магии.
export interface SimRules {
  winsNeeded: number;
  roundDurationTicks: number;
  suddenDeathMaxTicks: number;
  intermissionTicks: number;
}

export interface MatchState {
  rules: SimRules;
  wins: [number, number];
  // Раундов доиграно до конца (для истории/тестов).
  roundsCompleted: number;
  over: boolean;
  winner: MageIndex | null;
  // reads[i] — что показал маг i (читается его оппонентом).
  reads: [OpponentRead, OpponentRead];
}

// Полное состояние боя — единственный сериализуемый снапшот.
export interface SimState {
  tick: number;
  rng: Rng;
  mages: [MageState, MageState];
  projectiles: Projectile[];
  round: RoundState;
  match: MatchState;
  // Счётчик для выдачи id снарядам (монотонный, детерминированный).
  nextProjectileId: number;
}

// --- События тика (наружу, Р38 п.4) ---
// Плоские объекты с полем type и tick; клиент подписывается, ядро о рендере
// не знает. Дискриминант — type.

export type SimEvent =
  // Каст ушёл в дело (валидное заклинание).
  | {
      readonly type: 'cast';
      readonly tick: number;
      readonly mage: MageIndex;
      readonly element: Element;
      readonly action: 'attack' | 'shield' | 'heal';
      readonly power: number;
      readonly cost: number;
    }
  // Каст отклонён нехваткой чернил.
  | { readonly type: 'cast-failed'; readonly tick: number; readonly mage: MageIndex; readonly reason: 'no-ink'; readonly cost: number }
  // Осечка: чернила за рисунок сгорели (Р29), стана нет.
  | { readonly type: 'misfire'; readonly tick: number; readonly mage: MageIndex; readonly burnedInk: number }
  // Рождён снаряд.
  | { readonly type: 'projectile-launched'; readonly tick: number; readonly mage: MageIndex; readonly projectileId: number; readonly element: Element; readonly damage: number; readonly flightTicks: number }
  // Поднят щит.
  | { readonly type: 'shield-raised'; readonly tick: number; readonly mage: MageIndex; readonly affinity: Element; readonly amount: number }
  // Хил себе.
  | { readonly type: 'heal'; readonly tick: number; readonly mage: MageIndex; readonly amount: number }
  // Попадание снаряда (mage — цель).
  | {
      readonly type: 'hit';
      readonly tick: number;
      readonly mage: MageIndex;
      readonly projectileId: number;
      readonly element: Element;
      readonly rawDamage: number;
      readonly absorbed: number;
      readonly hpDamage: number;
      readonly appliedVulnerability: boolean;
    }
  // Щит пробит (израсходован пул).
  | { readonly type: 'shield-broken'; readonly tick: number; readonly mage: MageIndex; readonly affinity: Element }
  // Начался раунд (в т.ч. первый).
  | { readonly type: 'round-start'; readonly tick: number; readonly round: number }
  // Раунд перешёл во внезапную смерть (равный HP на исходе времени).
  | { readonly type: 'sudden-death'; readonly tick: number; readonly round: number }
  // Раунд завершён.
  | { readonly type: 'round-end'; readonly tick: number; readonly round: number; readonly winner: MageIndex | null; readonly reason: RoundEndReason }
  // Матч завершён.
  | { readonly type: 'match-end'; readonly tick: number; readonly winner: MageIndex | null; readonly wins: readonly [number, number] };

export interface StepResult {
  readonly state: SimState;
  readonly events: readonly SimEvent[];
}
