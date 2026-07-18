// Seeded RNG для детерминизма ядра (Р38: «случайность — только seeded RNG из
// состояния»). Никаких Math.random/Date. Состояние генератора — одно 32-битное
// число внутри SimState; каждый вызов продвигает его и возвращает результат,
// поэтому случайность полностью воспроизводима по сиду (реплей, Р12).
//
// Алгоритм — mulberry32: быстрый, без внешних зависимостей, качества хватает
// для джиттера бота и разрешения внезапной смерти. Состояние держим в
// обёртке-объекте, чтобы функции мутировали его на месте (draft внутри step).

export interface Rng {
  // Текущее состояние генератора (uint32). Сериализуемо как обычное число.
  state: number;
}

// Создать генератор из сида. Сид приводится к uint32.
export function makeRng(seed: number): Rng {
  return { state: seed >>> 0 };
}

// Продвинуть генератор и вернуть 32-битное беззнаковое число.
export function nextUint32(rng: Rng): number {
  // mulberry32.
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

// Число с плавающей точкой в [0, 1).
export function nextFloat(rng: Rng): number {
  return nextUint32(rng) / 0x100000000;
}

// Целое в [0, maxExclusive). При maxExclusive <= 0 возвращает 0.
export function nextInt(rng: Rng, maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  return Math.floor(nextFloat(rng) * maxExclusive);
}

// Целое в [min, max] включительно.
export function nextIntInclusive(rng: Rng, min: number, max: number): number {
  if (max <= min) return min;
  return min + nextInt(rng, max - min + 1);
}
