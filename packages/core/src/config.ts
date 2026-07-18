// Единственное место для всех чисел баланса InkArena (Р44).
// Логика в sim/spellcraft/recognition/geometry обращается к этим значениям —
// магических констант в коде быть не должно. Пока пусто: наполняется по мере
// появления модулей ядра.
export const config = {} as const;

export type Config = typeof config;
