import type { CastOutcome } from '../spellcraft/types.js';
import { corpusCast } from './corpus.js';
import { nextIntInclusive, type Rng } from './rng.js';
import type { BotState } from './types.js';

// Бот-манекен ПвЕ (Р32). Не ИИ-стратегия: детерминированный автомат, который
// кастует заклинания из своей ротации по расписанию с RNG-джиттером интервала.
// Вся случайность — через переданный Rng (из состояния), поэтому решение бота
// воспроизводимо по сиду. Сложность (интервал/разброс/набор) — в BotState.
//
// Возвращает CastOutcome, если на этом тике пора кастовать, иначе null.
// Мутирует BotState (rotationIndex, nextCastTick) и Rng — вызывается step на
// draft-состоянии, поэтому изменения корректно попадают в новый снапшот.
export function botAct(bot: BotState, rng: Rng, tick: number): CastOutcome | null {
  if (tick < bot.nextCastTick) return null;

  const id = bot.rotation[bot.rotationIndex % bot.rotation.length];
  const cast = corpusCast(id);

  bot.rotationIndex = (bot.rotationIndex + 1) % bot.rotation.length;
  // Следующий каст: базовый интервал ± джиттер (детерминированно из RNG).
  const jitter = bot.jitterTicks > 0 ? nextIntInclusive(rng, -bot.jitterTicks, bot.jitterTicks) : 0;
  const interval = Math.max(1, bot.intervalTicks + jitter);
  bot.nextCastTick = tick + interval;

  return cast;
}
