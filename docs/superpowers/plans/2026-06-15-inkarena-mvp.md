# InkArena MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать веб-песочницу InkArena: игрок свободно рисует глиф на canvas, игра распознаёт ближайший глиф (точность 0..1), считает скорость каста, вызывает эффект, а два глифа подряд складываются в комбо.

**Architecture:** Чистый TypeScript без игрового движка. Логика разбита на изолированные модули с чистыми функциями (geometry, recognition, spells, combo) — они покрыты юнит-тестами; визуальные модули (drawing-renderer, effects, hud, main) проверяются вручную в браузере. Распознавание — алгоритм `$P Point-Cloud Recognizer`.

**Tech Stack:** TypeScript, HTML5 Canvas, Vite (сборка/дев-сервер), Vitest (тесты). Менеджер пакетов — npm.

**Соглашения проекта (действуют для всех коммитов в плане):**
- Conventional Commits, сообщения на русском, кратко но понятно.
- Автор только владелец репозитория (`git config user.email` уже = `eriktarakan@gmail.com`). Не добавлять упоминаний ассистентов.
- Перед коммитом прогонять `npm test` и `npm run build` там, где это применимо.

**Спека:** `docs/superpowers/specs/2026-06-15-inkarena-mvp-design.md`

---

## Карта файлов

Создаётся:

| Файл | Ответственность |
|------|-----------------|
| `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` | конфигурация сборки и тестов |
| `index.html` | страница с canvas и контейнером HUD |
| `src/main.ts` | точка входа: создаёт модули, ставит обработчики, игровой цикл |
| `src/config.ts` | все числовые «крутилки» баланса |
| `src/geometry.ts` | тип `Point`, расстояние, длина пути (чистые функции) |
| `src/drawing/stroke.ts` | тип `Stroke`, класс `StrokeRecorder` (накопление точек) |
| `src/drawing/canvas-renderer.ts` | отрисовка живого следа чернил |
| `src/recognition/glyphs.ts` | эталоны глифов (огонь, вода, щит, стрела) |
| `src/recognition/recognizer.ts` | алгоритм `$P`: `recognize(points, templates)` |
| `src/spells/spell-system.ts` | сборка `Spell` из результата распознавания + длительности |
| `src/spells/combo.ts` | буфер последовательности глифов → комбо |
| `src/effects/effects.ts` | простые частицы/вспышки на canvas |
| `src/ui/hud.ts` | текстовая обратная связь (элемент, точность %, скорость, комбо) |
| `tests/*.test.ts` | юнит-тесты чистых модулей |
| `README.md`, `CLAUDE.md`, `AGENTS.md` | описание проекта и инструкции ассистентам |
| `docs/idea.md`, `docs/architecture.md`, `docs/development.md`, `docs/roadmap.md` | документация |

---

## Task 0: Скаффолдинг проекта

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.gitignore`, `src/main.ts`

- [ ] **Step 1: Создать `package.json`**

```json
{
  "name": "ink-arena",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Создать `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Создать `vite.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
});
```

- [ ] **Step 4: Создать `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 5: Создать `index.html`**

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <title>InkArena</title>
    <style>
      html, body { margin: 0; height: 100%; background: #11131a; overflow: hidden; touch-action: none; }
      #game { display: block; width: 100vw; height: 100vh; }
      #hud {
        position: fixed; top: 12px; left: 12px; color: #e8eaf0;
        font-family: system-ui, sans-serif; font-size: 16px; line-height: 1.5;
        pointer-events: none; text-shadow: 0 1px 2px #000;
      }
    </style>
  </head>
  <body>
    <canvas id="game"></canvas>
    <div id="hud"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Создать `.gitignore`**

```
node_modules
dist
*.local
.DS_Store
```

- [ ] **Step 7: Создать заглушку `src/main.ts`**

```ts
// Точка входа. Наполняется в Task 10.
const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
console.log('InkArena загружен');
```

- [ ] **Step 8: Установить зависимости и проверить, что dev-сервер стартует**

Run: `npm install`
Затем: `npm run build`
Expected: установка без ошибок; `npm run build` завершается успешно и создаёт папку `dist/`.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json vite.config.ts vitest.config.ts index.html .gitignore src/main.ts package-lock.json
git commit -m "chore: скаффолдинг проекта (Vite + TS + Vitest)"
```

---

## Task 1: Геометрия (Point, расстояние, длина пути)

**Files:**
- Create: `src/geometry.ts`
- Test: `tests/geometry.test.ts`

- [ ] **Step 1: Написать падающий тест**

`tests/geometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { distance, pathLength, type Point } from '../src/geometry';

const p = (x: number, y: number, t = 0): Point => ({ x, y, t });

describe('geometry', () => {
  it('distance считает евклидово расстояние', () => {
    expect(distance(p(0, 0), p(3, 4))).toBe(5);
  });

  it('pathLength суммирует длину ломаной', () => {
    expect(pathLength([p(0, 0), p(0, 10), p(10, 10)])).toBe(20);
  });

  it('pathLength для одной точки равна 0', () => {
    expect(pathLength([p(5, 5)])).toBe(0);
  });
});
```

- [ ] **Step 2: Прогнать тест — убедиться, что падает**

Run: `npm test -- geometry`
Expected: FAIL — модуль `../src/geometry` не найден.

- [ ] **Step 3: Реализовать `src/geometry.ts`**

```ts
export interface Point {
  x: number;
  y: number;
  /** Метка времени в мс (от первой точки штриха). */
  t: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pathLength(points: Point[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum += distance(points[i - 1], points[i]);
  }
  return sum;
}
```

- [ ] **Step 4: Прогнать тест — убедиться, что проходит**

Run: `npm test -- geometry`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add src/geometry.ts tests/geometry.test.ts
git commit -m "feat: модуль геометрии (расстояние, длина пути)"
```

---

## Task 2: Запись штриха (StrokeRecorder)

**Files:**
- Create: `src/drawing/stroke.ts`
- Test: `tests/stroke.test.ts`

`StrokeRecorder` — чистая логика накопления точек, без DOM. `start(x, y, time)` начинает штрих, `add(x, y, time)` добавляет точку, `finish()` возвращает `Stroke` и сбрасывает состояние. Время точек хранится относительно первой точки (первая точка имеет `t = 0`).

- [ ] **Step 1: Написать падающий тест**

`tests/stroke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { StrokeRecorder } from '../src/drawing/stroke';

describe('StrokeRecorder', () => {
  it('записывает точки с относительным временем', () => {
    const r = new StrokeRecorder();
    r.start(10, 20, 1000);
    r.add(30, 40, 1100);
    const stroke = r.finish();
    expect(stroke.points).toEqual([
      { x: 10, y: 20, t: 0 },
      { x: 30, y: 40, t: 100 },
    ]);
  });

  it('duration равна времени между первой и последней точкой', () => {
    const r = new StrokeRecorder();
    r.start(0, 0, 5000);
    r.add(1, 1, 5250);
    expect(r.finish().duration).toBe(250);
  });

  it('isDrawing отражает состояние записи', () => {
    const r = new StrokeRecorder();
    expect(r.isDrawing).toBe(false);
    r.start(0, 0, 0);
    expect(r.isDrawing).toBe(true);
    r.finish();
    expect(r.isDrawing).toBe(false);
  });

  it('add без start игнорируется', () => {
    const r = new StrokeRecorder();
    r.add(1, 1, 100);
    expect(r.isDrawing).toBe(false);
  });
});
```

- [ ] **Step 2: Прогнать тест — убедиться, что падает**

Run: `npm test -- stroke`
Expected: FAIL — модуль `../src/drawing/stroke` не найден.

- [ ] **Step 3: Реализовать `src/drawing/stroke.ts`**

```ts
import type { Point } from '../geometry';

export interface Stroke {
  points: Point[];
  /** Длительность штриха в мс. */
  duration: number;
}

export class StrokeRecorder {
  private points: Point[] = [];
  private startTime = 0;
  private drawing = false;

  get isDrawing(): boolean {
    return this.drawing;
  }

  start(x: number, y: number, time: number): void {
    this.points = [{ x, y, t: 0 }];
    this.startTime = time;
    this.drawing = true;
  }

  add(x: number, y: number, time: number): void {
    if (!this.drawing) return;
    this.points.push({ x, y, t: time - this.startTime });
  }

  finish(): Stroke {
    const points = this.points;
    const duration = points.length > 0 ? points[points.length - 1].t : 0;
    this.points = [];
    this.drawing = false;
    return { points, duration };
  }

  /** Текущие точки (для отрисовки живого следа). */
  get current(): readonly Point[] {
    return this.points;
  }
}
```

- [ ] **Step 4: Прогнать тест — убедиться, что проходит**

Run: `npm test -- stroke`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add src/drawing/stroke.ts tests/stroke.test.ts
git commit -m "feat: запись штриха (StrokeRecorder)"
```

---

## Task 3: Распознаватель $P + эталоны глифов

**Files:**
- Create: `src/recognition/recognizer.ts`, `src/recognition/glyphs.ts`
- Test: `tests/recognizer.test.ts`

Алгоритм `$P Point-Cloud Recognizer`: точки приводятся к каноническому виду (resample до N точек → масштаб в единичный квадрат → центрирование в начало координат), затем `greedy cloud match` ищет ближайший эталон и возвращает дистанцию. Дистанция нормируется в оценку `score` в диапазоне `0..1`.

**Важно про тесты:** точные пороги `score` подбираются эмпирически, поэтому тесты проверяют *свойства*, а не магические числа: (1) для входа, повторяющего эталон, top-матч — этот же глиф и `score` близок к 1; (2) `score` всегда в `[0, 1]`; (3) более похожий вход даёт больший `score`, чем заметно искажённый.

- [ ] **Step 1: Реализовать эталоны `src/recognition/glyphs.ts`**

```ts
import type { Point } from '../geometry';

export interface Glyph {
  id: string;
  /** Человекочитаемое имя элемента. */
  name: string;
  /** Точки-эталон (в произвольном масштабе; нормируются при распознавании). */
  points: Point[];
}

const p = (x: number, y: number): Point => ({ x, y, t: 0 });

/** Точки окружности радиуса r вокруг (cx, cy), n штук. */
function circle(cx: number, cy: number, r: number, n: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    pts.push(p(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  return pts;
}

export const GLYPHS: Glyph[] = [
  {
    id: 'fire',
    name: 'Огонь',
    // Треугольник △
    points: [p(50, 0), p(0, 100), p(100, 100), p(50, 0)],
  },
  {
    id: 'water',
    name: 'Вода',
    // Волна ~
    points: [p(0, 50), p(25, 0), p(50, 50), p(75, 100), p(100, 50)],
  },
  {
    id: 'shield',
    name: 'Щит',
    // Окружность ○
    points: circle(50, 50, 50, 16),
  },
  {
    id: 'arrow',
    name: 'Стрела',
    // Диагональ /
    points: [p(0, 100), p(50, 50), p(100, 0)],
  },
];
```

- [ ] **Step 2: Написать падающий тест**

`tests/recognizer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { recognize } from '../src/recognition/recognizer';
import { GLYPHS } from '../src/recognition/glyphs';
import type { Point } from '../src/geometry';

const fire = GLYPHS.find((g) => g.id === 'fire')!;

// слегка зашумлённая копия точек эталона
function jitter(points: Point[], amount: number): Point[] {
  return points.map((pt, i) => ({
    x: pt.x + (i % 2 === 0 ? amount : -amount),
    y: pt.y + (i % 2 === 0 ? -amount : amount),
    t: 0,
  }));
}

describe('recognize ($P)', () => {
  it('узнаёт глиф, повторяющий эталон', () => {
    const res = recognize(fire.points, GLYPHS)!;
    expect(res.glyph.id).toBe('fire');
    expect(res.score).toBeGreaterThan(0.85);
  });

  it('score всегда в диапазоне [0, 1]', () => {
    const res = recognize(jitter(fire.points, 15), GLYPHS)!;
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(1);
  });

  it('более точный рисунок даёт больший score, чем искажённый', () => {
    const clean = recognize(fire.points, GLYPHS)!;
    const noisy = recognize(jitter(fire.points, 25), GLYPHS)!;
    expect(clean.score).toBeGreaterThan(noisy.score);
  });

  it('возвращает null на пустом или одной точке', () => {
    expect(recognize([], GLYPHS)).toBeNull();
    expect(recognize([{ x: 1, y: 1, t: 0 }], GLYPHS)).toBeNull();
  });
});
```

- [ ] **Step 3: Прогнать тест — убедиться, что падает**

Run: `npm test -- recognizer`
Expected: FAIL — модуль `../src/recognition/recognizer` не найден.

- [ ] **Step 4: Реализовать `src/recognition/recognizer.ts`**

```ts
import { distance, pathLength, type Point } from '../geometry';
import type { Glyph } from './glyphs';

const NUM_POINTS = 32;

export interface MatchResult {
  glyph: Glyph;
  /** Похожесть 0..1 (1 — идеальное совпадение). */
  score: number;
}

function resample(points: Point[], n: number): Point[] {
  const interval = pathLength(points) / (n - 1);
  let accumulated = 0;
  const pts = points.map((pt) => ({ ...pt }));
  const result: Point[] = [{ ...pts[0] }];

  for (let i = 1; i < pts.length; i++) {
    const d = distance(pts[i - 1], pts[i]);
    if (accumulated + d >= interval) {
      const ratio = (interval - accumulated) / d;
      const q: Point = {
        x: pts[i - 1].x + ratio * (pts[i].x - pts[i - 1].x),
        y: pts[i - 1].y + ratio * (pts[i].y - pts[i - 1].y),
        t: 0,
      };
      result.push(q);
      pts.splice(i, 0, q);
      accumulated = 0;
    } else {
      accumulated += d;
    }
  }
  while (result.length < n) result.push({ ...pts[pts.length - 1] });
  return result;
}

function scaleToUnit(points: Point[]): Point[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of points) {
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  }
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  return points.map((pt) => ({ x: (pt.x - minX) / size, y: (pt.y - minY) / size, t: 0 }));
}

function translateToOrigin(points: Point[]): Point[] {
  let cx = 0, cy = 0;
  for (const pt of points) { cx += pt.x; cy += pt.y; }
  cx /= points.length;
  cy /= points.length;
  return points.map((pt) => ({ x: pt.x - cx, y: pt.y - cy, t: 0 }));
}

export function normalize(points: Point[]): Point[] {
  return translateToOrigin(scaleToUnit(resample(points, NUM_POINTS)));
}

function cloudDistance(a: Point[], b: Point[], start: number): number {
  const n = a.length;
  const matched = new Array<boolean>(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let min = Infinity;
    let index = -1;
    for (let j = 0; j < n; j++) {
      if (!matched[j]) {
        const d = distance(a[i], b[j]);
        if (d < min) { min = d; index = j; }
      }
    }
    if (index >= 0) matched[index] = true;
    const weight = 1 - ((i - start + n) % n) / n;
    sum += weight * min;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

function greedyMatch(a: Point[], b: Point[]): number {
  const n = a.length;
  const step = Math.max(1, Math.floor(Math.pow(n, 0.5)));
  let min = Infinity;
  for (let i = 0; i < n; i += step) {
    min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
  }
  return min;
}

export function recognize(points: Point[], templates: Glyph[]): MatchResult | null {
  if (points.length < 2 || templates.length === 0) return null;

  const candidate = normalize(points);
  let best: Glyph | null = null;
  let bestDist = Infinity;
  for (const tmpl of templates) {
    const d = greedyMatch(candidate, normalize(tmpl.points));
    if (d < bestDist) { bestDist = d; best = tmpl; }
  }
  if (!best) return null;

  // Нормировка дистанции в score. Делитель подобран так, чтобы точное
  // совпадение давало score ~1, а явно чужой глиф — близко к 0.
  const score = Math.max(0, Math.min(1, 1 - bestDist / (0.4 * NUM_POINTS)));
  return { glyph: best, score };
}
```

- [ ] **Step 5: Прогнать тест — убедиться, что проходит**

Run: `npm test -- recognizer`
Expected: PASS (4 теста). Если `score` для точного совпадения окажется ниже 0.85 — подстроить делитель `0.4 * NUM_POINTS` (уменьшить множитель повышает score). Это единственная «крутилка» распознавания.

- [ ] **Step 6: Commit**

```bash
git add src/recognition/glyphs.ts src/recognition/recognizer.ts tests/recognizer.test.ts
git commit -m "feat: распознаватель глифов \$P и эталоны"
```

---

## Task 4: Конфиг баланса

**Files:**
- Create: `src/config.ts`

- [ ] **Step 1: Создать `src/config.ts`**

```ts
/** Все «крутилки» баланса в одном месте. */
export const CONFIG = {
  /** Минимальная похожесть, ниже которой заклинание считается «провалом». */
  minScore: 0.4,
  /** Окно для комбо в мс: второй глиф должен быть нарисован в этот срок. */
  comboWindowMs: 2000,
  /** Пороги длительности штриха (мс) для категории скорости. */
  speed: {
    fastBelowMs: 500,
    slowAboveMs: 1500,
  },
} as const;

export type SpeedTier = 'fast' | 'normal' | 'slow';
```

- [ ] **Step 2: Проверить сборку типов**

Run: `npm run build`
Expected: PASS без ошибок типов.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: конфиг баланса (пороги score, окно комбо, скорость)"
```

---

## Task 5: Система заклинаний (Spell из распознавания + длительности)

**Files:**
- Create: `src/spells/spell-system.ts`
- Test: `tests/spell-system.test.ts`

`buildSpell(match, durationMs)` превращает результат распознавания и длительность штриха в `Spell { element, elementId, power, speed, success }`. `power = round(score * 100)`. `speed` берётся из порогов `CONFIG.speed`. `success = score >= CONFIG.minScore`.

- [ ] **Step 1: Написать падающий тест**

`tests/spell-system.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSpell } from '../src/spells/spell-system';
import type { MatchResult } from '../src/recognition/recognizer';

const match = (id: string, name: string, score: number): MatchResult => ({
  glyph: { id, name, points: [] },
  score,
});

describe('buildSpell', () => {
  it('power = round(score * 100)', () => {
    const spell = buildSpell(match('fire', 'Огонь', 0.873), 800);
    expect(spell.power).toBe(87);
    expect(spell.elementId).toBe('fire');
    expect(spell.element).toBe('Огонь');
  });

  it('быстрый штрих → speed fast', () => {
    expect(buildSpell(match('fire', 'Огонь', 0.9), 300).speed).toBe('fast');
  });

  it('медленный штрих → speed slow', () => {
    expect(buildSpell(match('fire', 'Огонь', 0.9), 2000).speed).toBe('slow');
  });

  it('средний штрих → speed normal', () => {
    expect(buildSpell(match('fire', 'Огонь', 0.9), 900).speed).toBe('normal');
  });

  it('низкий score → success=false', () => {
    expect(buildSpell(match('fire', 'Огонь', 0.2), 800).success).toBe(false);
  });

  it('достаточный score → success=true', () => {
    expect(buildSpell(match('fire', 'Огонь', 0.6), 800).success).toBe(true);
  });
});
```

- [ ] **Step 2: Прогнать тест — убедиться, что падает**

Run: `npm test -- spell-system`
Expected: FAIL — модуль `../src/spells/spell-system` не найден.

- [ ] **Step 3: Реализовать `src/spells/spell-system.ts`**

```ts
import { CONFIG, type SpeedTier } from '../config';
import type { MatchResult } from '../recognition/recognizer';

export interface Spell {
  elementId: string;
  element: string;
  power: number;
  speed: SpeedTier;
  success: boolean;
}

function speedTier(durationMs: number): SpeedTier {
  if (durationMs < CONFIG.speed.fastBelowMs) return 'fast';
  if (durationMs > CONFIG.speed.slowAboveMs) return 'slow';
  return 'normal';
}

export function buildSpell(match: MatchResult, durationMs: number): Spell {
  return {
    elementId: match.glyph.id,
    element: match.glyph.name,
    power: Math.round(match.score * 100),
    speed: speedTier(durationMs),
    success: match.score >= CONFIG.minScore,
  };
}
```

- [ ] **Step 4: Прогнать тест — убедиться, что проходит**

Run: `npm test -- spell-system`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/spells/spell-system.ts tests/spell-system.test.ts
git commit -m "feat: система заклинаний (power, скорость, успех)"
```

---

## Task 6: Комбо (буфер последовательности глифов)

**Files:**
- Create: `src/spells/combo.ts`
- Test: `tests/combo.test.ts`

`ComboTracker.push(elementId, timeMs)` добавляет глиф в буфер. Если предыдущий глиф был в пределах `CONFIG.comboWindowMs` и пара есть в таблице комбо — возвращает `{ type: 'combo', combo }`. Иначе возвращает `{ type: 'single', elementId }` и кладёт текущий глиф как «ожидающий» для возможной следующей пары. Истёкшее окно сбрасывает ожидание.

- [ ] **Step 1: Написать падающий тест**

`tests/combo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ComboTracker, COMBOS } from '../src/spells/combo';

describe('ComboTracker', () => {
  it('два совместимых глифа в окне → комбо', () => {
    const t = new ComboTracker();
    expect(t.push('fire', 0).type).toBe('single');
    const r = t.push('arrow', 1000);
    expect(r.type).toBe('combo');
    if (r.type === 'combo') expect(r.combo.id).toBe('fireball');
  });

  it('второй глиф вне окна → одиночный, не комбо', () => {
    const t = new ComboTracker();
    t.push('fire', 0);
    const r = t.push('arrow', 5000);
    expect(r.type).toBe('single');
  });

  it('несочетающиеся глифы → одиночный', () => {
    const t = new ComboTracker();
    t.push('fire', 0);
    const r = t.push('fire', 500);
    expect(r.type).toBe('single');
  });

  it('таблица комбо содержит вода+щит', () => {
    const found = COMBOS.find((c) => c.id === 'healing-barrier');
    expect(found).toBeDefined();
    expect(found!.parts).toEqual(['water', 'shield']);
  });

  it('после комбо буфер сбрасывается', () => {
    const t = new ComboTracker();
    t.push('fire', 0);
    t.push('arrow', 1000); // combo
    const r = t.push('arrow', 1200); // не должно склеиться с прошлым
    expect(r.type).toBe('single');
  });
});
```

- [ ] **Step 2: Прогнать тест — убедиться, что падает**

Run: `npm test -- combo`
Expected: FAIL — модуль `../src/spells/combo` не найден.

- [ ] **Step 3: Реализовать `src/spells/combo.ts`**

```ts
import { CONFIG } from '../config';

export interface Combo {
  id: string;
  name: string;
  /** Упорядоченная пара id глифов. */
  parts: [string, string];
}

export const COMBOS: Combo[] = [
  { id: 'fireball', name: 'Огнешар', parts: ['fire', 'arrow'] },
  { id: 'healing-barrier', name: 'Лечащий барьер', parts: ['water', 'shield'] },
];

export type ComboResult =
  | { type: 'single'; elementId: string }
  | { type: 'combo'; combo: Combo };

export class ComboTracker {
  private lastId: string | null = null;
  private lastTime = 0;

  push(elementId: string, timeMs: number): ComboResult {
    if (this.lastId !== null && timeMs - this.lastTime <= CONFIG.comboWindowMs) {
      const combo = COMBOS.find(
        (c) => c.parts[0] === this.lastId && c.parts[1] === elementId,
      );
      if (combo) {
        this.reset();
        return { type: 'combo', combo };
      }
    }
    this.lastId = elementId;
    this.lastTime = timeMs;
    return { type: 'single', elementId };
  }

  private reset(): void {
    this.lastId = null;
    this.lastTime = 0;
  }
}
```

- [ ] **Step 4: Прогнать тест — убедиться, что проходит**

Run: `npm test -- combo`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/spells/combo.ts tests/combo.test.ts
git commit -m "feat: комбо-трекер (последовательность глифов в окне)"
```

---

## Task 7: Отрисовка следа чернил (canvas-renderer)

**Files:**
- Create: `src/drawing/canvas-renderer.ts`

Визуальный модуль, проверяется глазами в браузере (Task 10). Рисует текущий незавершённый штрих светящейся линией.

- [ ] **Step 1: Создать `src/drawing/canvas-renderer.ts`**

```ts
import type { Point } from '../geometry';

export function drawInk(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  color = '#7cc7ff',
): void {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}
```

- [ ] **Step 2: Проверить сборку типов**

Run: `npm run build`
Expected: PASS без ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/drawing/canvas-renderer.ts
git commit -m "feat: отрисовка следа чернил на canvas"
```

---

## Task 8: Визуальные эффекты заклинаний (effects)

**Files:**
- Create: `src/effects/effects.ts`

Простая система частиц: при срабатывании заклинания добавляется вспышка частиц заданного цвета. `EffectSystem.burst(x, y, color, power)` создаёт частицы; `update(dt)` двигает и гасит их; `draw(ctx)` рисует. Проверяется в браузере (Task 10).

- [ ] **Step 1: Создать `src/effects/effects.ts`**

```ts
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1..0
  color: string;
}

export class EffectSystem {
  private particles: Particle[] = [];

  burst(x: number, y: number, color: string, power: number): void {
    const count = 12 + Math.round(power / 3);
    for (let i = 0; i < count; i++) {
      const a = (2 * Math.PI * i) / count;
      const speed = 1 + (power / 100) * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 1,
        color,
      });
    }
  }

  update(dt: number): void {
    const decay = dt / 700;
    for (const p of this.particles) {
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.life -= decay;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Цвет эффекта по id элемента/комбо. */
export function colorFor(id: string): string {
  const map: Record<string, string> = {
    fire: '#ff6a3d',
    water: '#3da5ff',
    shield: '#ffd23d',
    arrow: '#c9d1d9',
    fireball: '#ff3d3d',
    'healing-barrier': '#3dffa5',
  };
  return map[id] ?? '#ffffff';
}
```

- [ ] **Step 2: Проверить сборку типов**

Run: `npm run build`
Expected: PASS без ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/effects/effects.ts
git commit -m "feat: система частиц для эффектов заклинаний"
```

---

## Task 9: HUD (текстовая обратная связь)

**Files:**
- Create: `src/ui/hud.ts`

Обновляет `#hud` текстом: последнее заклинание, элемент, точность %, скорость, комбо. Проверяется в браузере (Task 10).

- [ ] **Step 1: Создать `src/ui/hud.ts`**

```ts
import type { Spell } from '../spells/spell-system';

export class Hud {
  constructor(private el: HTMLElement) {
    this.el.innerHTML = 'Нарисуй глиф: △ огонь · ~ вода · ○ щит · / стрела';
  }

  showSpell(spell: Spell): void {
    if (!spell.success) {
      this.el.innerHTML = `Заклинание рассеялось (точность ${spell.power}%) — рисуй точнее`;
      return;
    }
    this.el.innerHTML =
      `<b>${spell.element}</b> · точность ${spell.power}% · скорость ${this.ru(spell.speed)}`;
  }

  showCombo(name: string, power: number): void {
    this.el.innerHTML = `КОМБО: <b>${name}</b> · сила ${power}%`;
  }

  private ru(speed: string): string {
    return { fast: 'быстро', normal: 'обычно', slow: 'медленно' }[speed] ?? speed;
  }
}
```

- [ ] **Step 2: Проверить сборку типов**

Run: `npm run build`
Expected: PASS без ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/ui/hud.ts
git commit -m "feat: HUD с обратной связью по заклинанию и комбо"
```

---

## Task 10: Связка всего в main.ts + ручная проверка в браузере

**Files:**
- Modify: `src/main.ts` (полностью заменить заглушку из Task 0)

Связывает ввод указателя → запись штриха → распознавание → заклинание/комбо → эффект + HUD. Указатель через Pointer Events (работает и мышь, и тач). Игровой цикл через `requestAnimationFrame` для частиц.

- [ ] **Step 1: Заменить `src/main.ts`**

```ts
import { StrokeRecorder } from './drawing/stroke';
import { drawInk } from './drawing/canvas-renderer';
import { recognize } from './recognition/recognizer';
import { GLYPHS } from './recognition/glyphs';
import { buildSpell } from './spells/spell-system';
import { ComboTracker } from './spells/combo';
import { EffectSystem, colorFor } from './effects/effects';
import { Hud } from './ui/hud';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const hud = new Hud(document.getElementById('hud')!);

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const recorder = new StrokeRecorder();
const combo = new ComboTracker();
const effects = new EffectSystem();

function center(points: readonly { x: number; y: number }[]): { x: number; y: number } {
  let x = 0, y = 0;
  for (const p of points) { x += p.x; y += p.y; }
  return { x: x / points.length, y: y / points.length };
}

canvas.addEventListener('pointerdown', (e) => {
  recorder.start(e.clientX, e.clientY, e.timeStamp);
});
canvas.addEventListener('pointermove', (e) => {
  if (recorder.isDrawing) recorder.add(e.clientX, e.clientY, e.timeStamp);
});
canvas.addEventListener('pointerup', (e) => {
  if (!recorder.isDrawing) return;
  const pts = [...recorder.current];
  const stroke = recorder.finish();
  const match = recognize(stroke.points, GLYPHS);
  if (!match) return;

  const spell = buildSpell(match, stroke.duration);
  const at = center(pts);

  if (!spell.success) {
    hud.showSpell(spell);
    return;
  }

  const result = combo.push(spell.elementId, e.timeStamp);
  if (result.type === 'combo') {
    hud.showCombo(result.combo.name, spell.power);
    effects.burst(at.x, at.y, colorFor(result.combo.id), Math.min(100, spell.power + 20));
  } else {
    hud.showSpell(spell);
    effects.burst(at.x, at.y, colorFor(spell.elementId), spell.power);
  }
});

let last = performance.now();
function loop(now: number): void {
  const dt = now - last;
  last = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  effects.update(dt);
  effects.draw(ctx);
  if (recorder.isDrawing) drawInk(ctx, recorder.current);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

- [ ] **Step 2: Запустить dev-сервер и проверить вручную**

Run: `npm run dev`
Открыть показанный URL (обычно `http://localhost:5173`).
Проверить вручную (чек-лист):
- [ ] след чернил рисуется при зажатой мыши/пальце;
- [ ] рисунок треугольника → HUD показывает «Огонь» с процентом точности;
- [ ] быстрый и медленный штрихи дают разную «скорость» в HUD;
- [ ] при срабатывании заклинания вылетают частицы нужного цвета;
- [ ] огонь, затем стрела в течение 2 сек → HUD «КОМБО: Огнешар»;
- [ ] вода, затем щит → «КОМБО: Лечащий барьер»;
- [ ] явно кривой рисунок → «Заклинание рассеялось».

- [ ] **Step 3: Проверить продакшн-сборку**

Run: `npm run build`
Expected: PASS, создаётся `dist/`.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: связать ввод, распознавание, заклинания, комбо и эффекты"
```

---

## Task 11: Документация и инструкции ассистентам

**Files:**
- Create: `README.md`, `CLAUDE.md`, `AGENTS.md`, `docs/idea.md`, `docs/architecture.md`, `docs/development.md`, `docs/roadmap.md`

- [ ] **Step 1: Создать `README.md`**

```markdown
# InkArena

PvP-игра, где заклинания **рисуют**: чем точнее глиф — тем сильнее заклинание,
чем быстрее рисуешь — тем быстрее каст, а разные глифы складываются в комбо.

Сейчас это MVP — одиночная веб-песочница для проверки идеи: рисуешь глиф,
видишь точность и скорость, получаешь эффект и комбинируешь глифы.

## Запуск

```bash
npm install
npm run dev      # дев-сервер (обычно http://localhost:5173)
```

## Тесты и сборка

```bash
npm test         # юнит-тесты (Vitest)
npm run build    # продакшн-сборка в dist/
```

## Как играть

Зажми мышь/палец и нарисуй глиф: △ огонь · ~ вода · ○ щит · / стрела.
Нарисуй два глифа подряд (в пределах ~2 сек) для комбо: огонь+стрела = огнешар,
вода+щит = лечащий барьер.

## Документация

См. папку [`docs/`](docs/): идея, архитектура, разработка, планы.
Стек: TypeScript + HTML5 Canvas + Vite. Распознавание — алгоритм $P.
```

- [ ] **Step 2: Создать `docs/idea.md`**

```markdown
# Идея InkArena

PvP-битвы заклинаниями, которые игроки рисуют от руки. Вдохновение — аниме
«академия колдовских колпаков».

## Ключевые механики
- **Точность рисунка → сила.** Чем ближе глиф к эталону, тем мощнее заклинание.
- **Скорость рисунка → скорость каста.** Быстрее нарисовал — быстрее применил.
- **Комбо.** Несколько глифов подряд складываются в составное заклинание.

## Видение
От одиночной песочницы (проверка кайфа от ядра) — к боям с ботом, затем к
онлайн-PvP с матчмейкингом и рейтингом.
```

- [ ] **Step 3: Создать `docs/architecture.md`**

```markdown
# Архитектура

Чистый TypeScript без игрового движка. Модули изолированы и общаются через
простые интерфейсы.

## Модули
- `geometry.ts` — тип `Point`, расстояние, длина пути. Чистые функции.
- `drawing/stroke.ts` — `StrokeRecorder`: накопление точек в `Stroke`. Без DOM.
- `drawing/canvas-renderer.ts` — отрисовка живого следа чернил.
- `recognition/glyphs.ts` — эталоны глифов.
- `recognition/recognizer.ts` — алгоритм $P: `recognize(points, templates)`.
- `spells/spell-system.ts` — сборка `Spell` (power, скорость, успех).
- `spells/combo.ts` — `ComboTracker`: последовательность глифов в окне времени.
- `effects/effects.ts` — система частиц.
- `ui/hud.ts` — текстовая обратная связь.
- `config.ts` — числовые крутилки баланса.
- `main.ts` — связывает ввод → распознавание → заклинание → эффект + HUD.

## Поток данных
ввод указателя → `StrokeRecorder` → `recognize()` → `buildSpell()` →
`ComboTracker.push()` → `EffectSystem` + `Hud`.

## Что тестируется
Чистые модули (geometry, stroke, recognizer, spell-system, combo) — юнит-тестами
Vitest. Визуальные модули — вручную в браузере.
```

- [ ] **Step 4: Создать `docs/development.md`**

```markdown
# Разработка

## Команды
- `npm run dev` — дев-сервер с горячей перезагрузкой.
- `npm test` — юнит-тесты (Vitest), `npm run test:watch` — в режиме watch.
- `npm run build` — продакшн-сборка в `dist/`.
- `npm run preview` — локальный предпросмотр собранной версии.

## Соглашения
- Conventional Commits, сообщения на русском, кратко но понятно.
- Автор коммитов только владелец репозитория (`eriktarakan@gmail.com`).
  Аккаунт `airerik@yandex.ru` забанен — не использовать.
- TDD для чистых модулей: сначала падающий тест, потом реализация.
- Баланс крутится только в `src/config.ts`.

## Деплой
Статическая сборка `dist/` раздаётся как обычный сайт (например, GitHub Pages).
`vite.config.ts` использует `base: './'` — сборка работает из любой подпапки.
```

- [ ] **Step 5: Создать `docs/roadmap.md`**

```markdown
# Дорожная карта

## MVP (текущий)
Одиночная песочница: рисование, распознавание, точность/скорость, комбо.

## Дальше (кандидаты, после проверки идеи)
1. Бой с простым ботом: HP, урон от заклинаний, условие победы.
2. Больше глифов и комбо, защитные/лечащие механики.
3. Звук и улучшенные эффекты.
4. Онлайн-PvP: Python-сервер (FastAPI) — матчмейкинг, синхронизация сессий.
5. Аккаунты и рейтинг.
6. Возможный переход на Phaser/Godot, если упрёмся в ограничения canvas.
```

- [ ] **Step 6: Создать `CLAUDE.md`**

```markdown
# CLAUDE.md — InkArena

InkArena — веб-игра про рисование заклинаний. Сейчас MVP: одиночная песочница
(рисование глифов, распознавание, точность/скорость, комбо).

## Стек
TypeScript + HTML5 Canvas + Vite. Тесты — Vitest. Распознавание — алгоритм $P.
Python в MVP не используется (запланирован как сервер позже).

## Команды
- `npm run dev` — дев-сервер.
- `npm test` — юнит-тесты.
- `npm run build` — сборка.

## Соглашения
- Conventional Commits, сообщения на русском, кратко но понятно. Длинные
  допустимы при необходимости.
- Автор коммитов только владелец (`eriktarakan@gmail.com`). НИКАКОГО упоминания
  ассистентов в авторстве/коммитах. Аккаунт `airerik@yandex.ru` забанен.
- TDD для чистых модулей (geometry, recognition, spells). Визуальные модули
  (canvas-renderer, effects, hud, main) проверяются вручную в браузере.
- Баланс — только в `src/config.ts`.
- Вся документация и планы — в папке `docs/`.

## Структура
См. `docs/architecture.md`.
```

- [ ] **Step 7: Создать `AGENTS.md` с тем же содержимым, что и `CLAUDE.md`**

Скопировать содержимое `CLAUDE.md` в `AGENTS.md` дословно (для ассистентов, читающих `AGENTS.md`). Первую строку заменить на `# AGENTS.md — InkArena`.

- [ ] **Step 8: Commit**

```bash
git add README.md CLAUDE.md AGENTS.md docs/idea.md docs/architecture.md docs/development.md docs/roadmap.md
git commit -m "docs: README, инструкции ассистентам и документация проекта"
```

---

## Финальная проверка

- [ ] **Step 1: Полный прогон тестов**

Run: `npm test`
Expected: все тесты PASS (geometry, stroke, recognizer, spell-system, combo).

- [ ] **Step 2: Продакшн-сборка**

Run: `npm run build`
Expected: PASS, `dist/` создаётся без ошибок.

- [ ] **Step 3: Ручная проверка в браузере**

Пройти чек-лист из Task 10, Step 2.

- [ ] **Step 4: Проверить чистоту дерева**

Run: `git status`
Expected: рабочее дерево чистое, все коммиты на месте.
