// Клиентские визуальные числа: размеры зон, длительности вспышек, цвета,
// радиусы фигур. Игрового баланса здесь нет — он в @inkarena/core (config.ts).
// Соглашение CLAUDE.md: магических чисел в логике клиента быть не должно,
// всё настраиваемое живёт тут.
export const clientConfig = {
  layout: {
    // Арена — верхние ~2/3 экрана; блокнот мага — нижняя треть во всю ширину
    // (docs/game/ux.md «Компоновка экрана боя», Р10). Доли высоты; сумма = 1,
    // зоны не перекрываются.
    arenaHeightRatio: 0.67,
    // Отступ фигур магов от краёв арены (доля высоты арены), чтобы снаряд
    // пролетал видимую дистанцию между ними.
    mageMarginRatio: 0.18,
  },
  mage: {
    // Радиус фигуры мага (доля меньшей стороны экрана).
    radiusRatio: 0.09,
  },
  projectile: {
    // Радиус снаряда (доля меньшей стороны экрана).
    radiusRatio: 0.028,
  },
  // Длительности эффектов в миллисекундах реального времени рендера.
  timings: {
    // Вспышка «распознан» контура глифа (Р31): короткий нейтральный сигнал.
    recognizedFlashMs: 380,
    // Как долго держится текстовая подача осечки/подсказки.
    feedbackMs: 1500,
    // Вспышка попадания на цели.
    hitFlashMs: 260,
    // Баннер исхода раунда во время передышки — держится столько же, сколько
    // передышка sim, но не короче этого минимума.
    roundBannerMinMs: 1200,
  },
  colors: {
    bg: '#11131a',
    notebookBg: '#171a24',
    notebookBorder: '#2a2f40',
    stroke: '#cfd6e6',
    recognized: '#5ad19a',
    misfire: '#e8734a',
    hint: '#c9a94a',
    player: '#4a9fe8',
    enemy: '#e85a7a',
    projectile: '#f2d16b',
    hit: '#ff5a4a',
    shield: '#8fe0ff',
    hpBar: '#5ad19a',
    hpBarBg: '#2a2f40',
    inkBar: '#4a9fe8',
    hudText: '#e6ebf5',
  },
  elementColors: {
    fire: '#e8734a',
    water: '#4a9fe8',
    air: '#b7c3d6',
    earth: '#b78b4a',
    lightning: '#e8d24a',
  },
} as const;

export type ClientConfig = typeof clientConfig;
