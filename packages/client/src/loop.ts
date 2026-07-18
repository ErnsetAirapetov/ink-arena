// Аккумулятор фиксированного тика симуляции. Рендер идёт по requestAnimation-
// Frame с переменным dt, а sim обязан шагать фиксированным тиком (детерминизм,
// docs/tech/architecture.md). Функция чистая: сколько тиков «созрело» в
// накопленном времени и какой под-тиковый остаток нести дальше (для alpha
// интерполяции рендера).

// Потолок тиков за кадр — защита от спирали смерти: при большом провале кадра
// backlog отбрасывается, а не догоняется бесконечными шагами.
export const MAX_TICKS_PER_FRAME = 5;

export interface TickPlan {
  ticks: number;
  // Остаток времени < длительности тика — переносится в следующий кадр.
  remainder: number;
}

export function ticksToRun(accumulatorMs: number, tickMs: number): TickPlan {
  const rawTicks = Math.floor(accumulatorMs / tickMs);
  // Остаток — всегда дробная часть тика (в [0, tickMs)).
  const remainder = accumulatorMs - rawTicks * tickMs;
  const ticks = Math.min(rawTicks, MAX_TICKS_PER_FRAME);
  return { ticks, remainder };
}
