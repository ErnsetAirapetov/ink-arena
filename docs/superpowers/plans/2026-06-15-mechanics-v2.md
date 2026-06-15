# Механика v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести InkArena на 6 стихий, мульти-штриховой ввод и каст по пробелу: игрок рисует сколько угодно линий, жмёт пробел, линии группируются по близости в 1–2 глифа и исполняются как одиночное заклинание или комбо.

**Architecture:** Чистый TypeScript, существующая модульная структура. Добавляются два чистых модуля — `recognition/clustering.ts` (группировка линий) и `spells/cast.ts` (разрешение каста и расчёт силы). Распознавание $P не меняется. Скорость рисования и временно́е окно комбо удаляются.

**Tech Stack:** TypeScript, HTML5 Canvas, Vite, Vitest.

**Спека:** `docs/superpowers/specs/2026-06-15-mechanics-v2-design.md`

**Соглашения:** Conventional Commits на русском; автор только владелец (`eriktarakan@gmail.com`), без упоминания ассистентов.

> **Важно про сборку во время рефакторинга.** Это рефакторинг с удалением старого API. После Task 4 и до Task 8 команда `npm run build` (полная проверка типов) **временно красная**, потому что `src/main.ts` ещё ссылается на старые модули. Это ожидаемо. Проверка логических задач идёт через `npm test -- <модуль>` (Vitest типы не проверяет). Task 8 переписывает `main.ts` и возвращает зелёную сборку; финальная проверка это подтверждает.

---

## Карта файлов

Создаётся:
- `src/recognition/clustering.ts` — `clusterStrokes(strokes, gapPx)` → группы линий.
- `src/spells/cast.ts` — `resolveCast(results)` → `CastOutcome` (single/combo/fizzle) + сила.
- `tests/clustering.test.ts`, `tests/cast.test.ts`.

Меняется:
- `src/geometry.ts` — добавить `Box`, `boundingBox`, `boxGap`.
- `src/recognition/glyphs.ts` — новый набор из 6 глифов (без `arrow`).
- `src/spells/combo.ts` — `findCombo(a, b)` порядок-независимый, новая таблица; убрать `ComboTracker`.
- `src/config.ts` — убрать `speed`, `comboWindowMs`, `SpeedTier`; добавить `clusterGapPx`.
- `src/effects/effects.ts` — цвета для новых id.
- `src/ui/hud.ts` — `showCast(outcome)` вместо `showSpell/showCombo`.
- `src/main.ts` — буфер линий, отрисовка всех линий, каст по пробелу.
- `docs/roadmap.md`, `docs/architecture.md`, `README.md`, `CLAUDE.md`, `AGENTS.md`.

Удаляется:
- `src/spells/spell-system.ts`, `tests/spell-system.test.ts` (логика силы уезжает в `cast.ts`).

---

## Task 1: Геометрия — bounding box и зазор между боксами

**Files:**
- Modify: `src/geometry.ts`
- Test: `tests/geometry.test.ts`

- [ ] **Step 1: Дописать падающие тесты в `tests/geometry.test.ts`**

Добавить в конец файла (после существующего `describe('geometry', ...)`):

```ts
import { boundingBox, boxGap } from '../src/geometry';

describe('boundingBox / boxGap', () => {
  it('boundingBox охватывает все точки', () => {
    const box = boundingBox([p(10, 20), p(30, 5), p(0, 40)]);
    expect(box).toEqual({ minX: 0, minY: 5, maxX: 30, maxY: 40 });
  });

  it('boxGap = 0 для пересекающихся боксов', () => {
    const a = boundingBox([p(0, 0), p(10, 10)]);
    const b = boundingBox([p(5, 5), p(15, 15)]);
    expect(boxGap(a, b)).toBe(0);
  });

  it('boxGap считает горизонтальный зазор', () => {
    const a = boundingBox([p(0, 0), p(10, 10)]);
    const b = boundingBox([p(25, 0), p(35, 10)]);
    expect(boxGap(a, b)).toBe(15);
  });

  it('boxGap считает диагональный зазор', () => {
    const a = boundingBox([p(0, 0), p(10, 10)]);
    const b = boundingBox([p(13, 14), p(20, 20)]);
    expect(boxGap(a, b)).toBe(5); // dx=3, dy=4 → 5
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `npm test -- geometry`
Expected: FAIL — `boundingBox`/`boxGap` не экспортируются.

- [ ] **Step 3: Дописать `src/geometry.ts`**

Добавить в конец файла:

```ts
export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundingBox(points: Point[]): Box {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }
  return { minX, minY, maxX, maxY };
}

/** Минимальный зазор между двумя боксами (0, если пересекаются). */
export function boxGap(a: Box, b: Box): number {
  const dx = Math.max(0, b.minX - a.maxX, a.minX - b.maxX);
  const dy = Math.max(0, b.minY - a.maxY, a.minY - b.maxY);
  return Math.hypot(dx, dy);
}
```

- [ ] **Step 4: Прогнать — убедиться, что проходит**

Run: `npm test -- geometry`
Expected: PASS (3 старых + 4 новых = 7 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/geometry.ts tests/geometry.test.ts
git commit -m "feat: геометрия — bounding box и зазор между боксами"
```

---

## Task 2: Кластеризация линий по близости

**Files:**
- Create: `src/recognition/clustering.ts`
- Test: `tests/clustering.test.ts`

`clusterStrokes(strokes, gapPx)` группирует линии одно-связной агломерацией: две линии в одной группе, если зазор между их боксами `< gapPx`; группировка транзитивна.

- [ ] **Step 1: Написать падающий тест**

`tests/clustering.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { clusterStrokes } from '../src/recognition/clustering';
import type { Stroke } from '../src/drawing/stroke';
import type { Point } from '../src/geometry';

const pt = (x: number, y: number): Point => ({ x, y, t: 0 });
// линия из двух точек: (x,y) и (x+10,y+10)
const st = (x: number, y: number): Stroke => ({
  points: [pt(x, y), pt(x + 10, y + 10)],
  duration: 0,
});

describe('clusterStrokes', () => {
  it('пустой ввод → пусто', () => {
    expect(clusterStrokes([], 50)).toEqual([]);
  });

  it('две близкие линии → одна группа', () => {
    const groups = clusterStrokes([st(0, 0), st(15, 0)], 50);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });

  it('две далёкие линии → две группы', () => {
    const groups = clusterStrokes([st(0, 0), st(500, 0)], 50);
    expect(groups).toHaveLength(2);
  });

  it('транзитивность: A~B, B~C, A далеко от C → одна группа', () => {
    // A:[0..10], B:[60..70], C:[120..130]; gap A-B=50, B-C=50 (< 55), A-C=110
    const groups = clusterStrokes([st(0, 0), st(60, 0), st(120, 0)], 55);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `npm test -- clustering`
Expected: FAIL — модуль `../src/recognition/clustering` не найден.

- [ ] **Step 3: Реализовать `src/recognition/clustering.ts`**

```ts
import { boundingBox, boxGap } from '../geometry';
import type { Stroke } from '../drawing/stroke';

/**
 * Группирует линии по пространственной близости (single-link).
 * Две линии в одной группе, если зазор между их боксами < gapPx.
 */
export function clusterStrokes(strokes: Stroke[], gapPx: number): Stroke[][] {
  const boxes = strokes.map((s) => boundingBox(s.points));
  const parent = strokes.map((_, i) => i);

  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (i: number, j: number): void => {
    parent[find(i)] = find(j);
  };

  for (let i = 0; i < strokes.length; i++) {
    for (let j = i + 1; j < strokes.length; j++) {
      if (boxGap(boxes[i], boxes[j]) < gapPx) union(i, j);
    }
  }

  const groups = new Map<number, Stroke[]>();
  strokes.forEach((s, i) => {
    const root = find(i);
    const group = groups.get(root);
    if (group) group.push(s);
    else groups.set(root, [s]);
  });
  return [...groups.values()];
}
```

- [ ] **Step 4: Прогнать — убедиться, что проходит**

Run: `npm test -- clustering`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add src/recognition/clustering.ts tests/clustering.test.ts
git commit -m "feat: кластеризация линий по близости (single-link)"
```

---

## Task 3: Новый набор глифов 6 стихий

**Files:**
- Modify: `src/recognition/glyphs.ts` (полностью заменить массив `GLYPHS`)
- Test: `tests/recognizer.test.ts` (заменить файл)

- [ ] **Step 1: Заменить `src/recognition/glyphs.ts`**

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

/** Архимедова спираль из центра наружу. */
function spiral(cx: number, cy: number, turns: number, n: number): Point[] {
  const pts: Point[] = [];
  const maxT = turns * 2 * Math.PI;
  for (let i = 0; i < n; i++) {
    const th = (maxT * i) / (n - 1);
    const r = (50 * th) / maxT;
    pts.push(p(cx + r * Math.cos(th), cy + r * Math.sin(th)));
  }
  return pts;
}

export const GLYPHS: Glyph[] = [
  {
    id: 'fire',
    name: 'Огонь',
    // Треугольник △ вершиной вверх
    points: [p(50, 0), p(0, 100), p(100, 100), p(50, 0)],
  },
  {
    id: 'water',
    name: 'Вода',
    // Волна ~ (две дуги)
    points: [p(0, 50), p(20, 10), p(40, 50), p(60, 90), p(80, 50), p(100, 10)],
  },
  {
    id: 'air',
    name: 'Воздух',
    // Спираль ◠
    points: spiral(50, 50, 2.5, 24),
  },
  {
    id: 'earth',
    name: 'Земля',
    // Квадрат □
    points: [p(0, 0), p(100, 0), p(100, 100), p(0, 100), p(0, 0)],
  },
  {
    id: 'lightning',
    name: 'Молния',
    // Зигзаг ⚡
    points: [p(55, 0), p(20, 40), p(45, 40), p(15, 100)],
  },
  {
    id: 'shield',
    name: 'Щит',
    // Круг ○
    points: circle(50, 50, 50, 16),
  },
];
```

- [ ] **Step 2: Заменить `tests/recognizer.test.ts`**

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

describe('recognize ($P) — 6 стихий', () => {
  it('каждый эталон узнаётся как сам себя с высокой точностью', () => {
    for (const g of GLYPHS) {
      const res = recognize(g.points, GLYPHS)!;
      expect(res.glyph.id, `глиф ${g.id}`).toBe(g.id);
      expect(res.score, `score ${g.id}`).toBeGreaterThan(0.9);
    }
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

- [ ] **Step 3: Прогнать — убедиться, что проходит**

Run: `npm test -- recognizer`
Expected: PASS (4 теста). Если какой-то эталон не узнаётся как сам себя — это значит две формы нормализуются в почти одинаковые облака; заменить более конфликтную форму (например, сделать молнию острее или квадрат — прямее). На практике 6 выбранных форм различны и self-recognition даёт score ≈ 1.

- [ ] **Step 4: Commit**

```bash
git add src/recognition/glyphs.ts tests/recognizer.test.ts
git commit -m "feat: набор глифов 6 стихий (огонь, вода, воздух, земля, молния, щит)"
```

---

## Task 4: Комбо — поиск без таймера, порядок-независимый

**Files:**
- Modify: `src/spells/combo.ts` (полностью заменить)
- Test: `tests/combo.test.ts` (полностью заменить)

> После этой задачи `npm run build` временно красный (main.ts ещё использует удалённый `ComboTracker`). Это ожидаемо — чиним в Task 8.

- [ ] **Step 1: Заменить `src/spells/combo.ts`**

```ts
export interface Combo {
  id: string;
  name: string;
  /** Пара id глифов (порядок при поиске не важен). */
  parts: [string, string];
}

export const COMBOS: Combo[] = [
  { id: 'firestorm', name: 'Огненный вихрь', parts: ['fire', 'air'] },
  { id: 'storm', name: 'Шторм', parts: ['water', 'lightning'] },
  { id: 'magma', name: 'Магма', parts: ['earth', 'fire'] },
  { id: 'healing-barrier', name: 'Лечащий барьер', parts: ['water', 'shield'] },
];

/** Ищет комбо по двум id глифов в любом порядке. */
export function findCombo(a: string, b: string): Combo | null {
  return (
    COMBOS.find(
      (c) =>
        (c.parts[0] === a && c.parts[1] === b) ||
        (c.parts[0] === b && c.parts[1] === a),
    ) ?? null
  );
}
```

- [ ] **Step 2: Заменить `tests/combo.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { findCombo, COMBOS } from '../src/spells/combo';

describe('findCombo', () => {
  it('находит комбо в прямом порядке', () => {
    expect(findCombo('fire', 'air')?.id).toBe('firestorm');
  });

  it('находит комбо в обратном порядке', () => {
    expect(findCombo('air', 'fire')?.id).toBe('firestorm');
  });

  it('несочетающиеся глифы → null', () => {
    expect(findCombo('fire', 'water')).toBeNull();
  });

  it('таблица содержит лечащий барьер (вода+щит)', () => {
    const found = COMBOS.find((c) => c.id === 'healing-barrier');
    expect(found).toBeDefined();
    expect(found!.parts).toEqual(['water', 'shield']);
  });
});
```

- [ ] **Step 3: Прогнать — убедиться, что проходит**

Run: `npm test -- combo`
Expected: PASS (4 теста).

- [ ] **Step 4: Commit**

```bash
git add src/spells/combo.ts tests/combo.test.ts
git commit -m "feat: комбо без таймера, поиск пары в любом порядке"
```

---

## Task 5: Разрешение каста (cast.ts)

**Files:**
- Create: `src/spells/cast.ts`
- Test: `tests/cast.test.ts`

> `npm run build` всё ещё временно красный до Task 8.

- [ ] **Step 1: Написать падающий тест**

`tests/cast.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveCast } from '../src/spells/cast';
import type { MatchResult } from '../src/recognition/recognizer';

const m = (id: string, name: string, score: number): MatchResult => ({
  glyph: { id, name, points: [] },
  score,
});

describe('resolveCast', () => {
  it('ничего не нарисовано → осечка', () => {
    expect(resolveCast([]).kind).toBe('fizzle');
  });

  it('больше двух глифов → осечка', () => {
    const r = resolveCast([m('fire', 'Огонь', 0.9), m('water', 'Вода', 0.9), m('air', 'Воздух', 0.9)]);
    expect(r.kind).toBe('fizzle');
  });

  it('один точный глиф → одиночное заклинание с power', () => {
    const r = resolveCast([m('fire', 'Огонь', 0.87)]);
    expect(r).toEqual({ kind: 'single', id: 'fire', name: 'Огонь', power: 87 });
  });

  it('один неточный глиф → осечка', () => {
    expect(resolveCast([m('fire', 'Огонь', 0.2)]).kind).toBe('fizzle');
  });

  it('два сочетающихся глифа → комбо со средней силой', () => {
    const r = resolveCast([m('fire', 'Огонь', 0.8), m('air', 'Воздух', 0.6)]);
    expect(r).toEqual({ kind: 'combo', id: 'firestorm', name: 'Огненный вихрь', power: 70 });
  });

  it('комбо порядок-независимо', () => {
    const r = resolveCast([m('air', 'Воздух', 0.8), m('fire', 'Огонь', 0.8)]);
    expect(r.kind).toBe('combo');
    if (r.kind === 'combo') expect(r.id).toBe('firestorm');
  });

  it('два несочетающихся глифа → осечка', () => {
    expect(resolveCast([m('fire', 'Огонь', 0.9), m('water', 'Вода', 0.9)]).kind).toBe('fizzle');
  });

  it('два глифа, один неточный → осечка', () => {
    expect(resolveCast([m('fire', 'Огонь', 0.9), m('air', 'Воздух', 0.2)]).kind).toBe('fizzle');
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `npm test -- cast`
Expected: FAIL — модуль `../src/spells/cast` не найден.

- [ ] **Step 3: Реализовать `src/spells/cast.ts`**

```ts
import { CONFIG } from '../config';
import { findCombo } from './combo';
import type { MatchResult } from '../recognition/recognizer';

export type CastOutcome =
  | { kind: 'single'; id: string; name: string; power: number }
  | { kind: 'combo'; id: string; name: string; power: number }
  | { kind: 'fizzle'; reason: string };

export function resolveCast(results: MatchResult[]): CastOutcome {
  if (results.length === 0) return { kind: 'fizzle', reason: 'Ничего не нарисовано' };
  if (results.length > 2) return { kind: 'fizzle', reason: 'Пока не больше двух глифов' };
  if (results.some((r) => r.score < CONFIG.minScore)) {
    return { kind: 'fizzle', reason: 'Слишком неточно — рисуй чётче' };
  }

  if (results.length === 1) {
    const r = results[0];
    return { kind: 'single', id: r.glyph.id, name: r.glyph.name, power: Math.round(r.score * 100) };
  }

  const [a, b] = results;
  const combo = findCombo(a.glyph.id, b.glyph.id);
  if (!combo) return { kind: 'fizzle', reason: 'Эти глифы не сочетаются' };
  const power = Math.round(((a.score + b.score) / 2) * 100);
  return { kind: 'combo', id: combo.id, name: combo.name, power };
}
```

- [ ] **Step 4: Прогнать — убедиться, что проходит**

Run: `npm test -- cast`
Expected: PASS (8 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/spells/cast.ts tests/cast.test.ts
git commit -m "feat: разрешение каста (одиночное/комбо/осечка + сила)"
```

---

## Task 6: Конфиг + удаление spell-system

**Files:**
- Modify: `src/config.ts` (полностью заменить)
- Delete: `src/spells/spell-system.ts`, `tests/spell-system.test.ts`

> `npm run build` всё ещё временно красный до Task 8.

- [ ] **Step 1: Заменить `src/config.ts`**

```ts
/** Все «крутилки» баланса в одном месте. */
export const CONFIG = {
  /** Минимальная похожесть, ниже которой заклинание считается «осечкой». */
  minScore: 0.4,
  /** Порог зазора (px) между линиями: меньше — один глиф, больше — разные. */
  clusterGapPx: 60,
} as const;
```

- [ ] **Step 2: Удалить старый модуль силы и его тест**

```bash
git rm src/spells/spell-system.ts tests/spell-system.test.ts
```

- [ ] **Step 3: Прогнать все логические тесты (без main)**

Run: `npm test`
Expected: PASS — geometry, stroke, clustering, recognizer, combo, cast. (Сборка `npm run build` пока красная — это ожидаемо, чиним в Task 8.)

- [ ] **Step 4: Commit**

```bash
git add src/config.ts
git commit -m "refactor: конфиг под v2 (clusterGapPx), удалить spell-system и скорость"
```

---

## Task 7: Цвета эффектов и HUD под v2

**Files:**
- Modify: `src/effects/effects.ts` (функция `colorFor`)
- Modify: `src/ui/hud.ts` (полностью заменить)

> `npm run build` всё ещё временно красный до Task 8.

- [ ] **Step 1: Заменить функцию `colorFor` в `src/effects/effects.ts`**

Заменить существующую `export function colorFor(...)` на:

```ts
/** Цвет эффекта по id элемента/комбо. */
export function colorFor(id: string): string {
  const map: Record<string, string> = {
    fire: '#ff5a36',
    water: '#3da5ff',
    air: '#d8f5e3',
    earth: '#a9743b',
    lightning: '#ffd23d',
    shield: '#c0a7ff',
    firestorm: '#ff8c1a',
    storm: '#6ad1ff',
    magma: '#ff3d12',
    'healing-barrier': '#3dffa5',
  };
  return map[id] ?? '#ffffff';
}
```

- [ ] **Step 2: Заменить `src/ui/hud.ts`**

```ts
import type { CastOutcome } from '../spells/cast';

export class Hud {
  constructor(private el: HTMLElement) {
    this.el.innerHTML =
      'Рисуй глифы, затем ПРОБЕЛ — каст. △ огонь · ~ вода · ◠ воздух · □ земля · ⚡ молния · ○ щит';
  }

  showCast(outcome: CastOutcome): void {
    if (outcome.kind === 'fizzle') {
      this.el.innerHTML = `Осечка: ${outcome.reason}`;
      return;
    }
    const label = outcome.kind === 'combo' ? 'КОМБО' : 'Заклинание';
    this.el.innerHTML = `${label}: <b>${outcome.name}</b> · сила ${outcome.power}%`;
  }
}
```

- [ ] **Step 3: Прогнать тесты (логика не затронута)**

Run: `npm test`
Expected: PASS (те же модули, что в Task 6). Сборка пока красная — чиним в Task 8.

- [ ] **Step 4: Commit**

```bash
git add src/effects/effects.ts src/ui/hud.ts
git commit -m "feat: цвета 6 стихий и HUD для каста (single/combo/осечка)"
```

---

## Task 8: Переписать main.ts на новый ввод (возврат зелёной сборки)

**Files:**
- Modify: `src/main.ts` (полностью заменить)

- [ ] **Step 1: Заменить `src/main.ts`**

```ts
import { StrokeRecorder, type Stroke } from './drawing/stroke';
import { drawInk } from './drawing/canvas-renderer';
import { recognize, type MatchResult } from './recognition/recognizer';
import { GLYPHS } from './recognition/glyphs';
import { clusterStrokes } from './recognition/clustering';
import { resolveCast } from './spells/cast';
import { EffectSystem, colorFor } from './effects/effects';
import { Hud } from './ui/hud';
import { CONFIG } from './config';
import { boundingBox } from './geometry';

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
const effects = new EffectSystem();
const strokes: Stroke[] = []; // буфер завершённых линий до каста

canvas.addEventListener('pointerdown', (e) => {
  recorder.start(e.clientX, e.clientY, e.timeStamp);
});
canvas.addEventListener('pointermove', (e) => {
  if (recorder.isDrawing) recorder.add(e.clientX, e.clientY, e.timeStamp);
});
canvas.addEventListener('pointerup', () => {
  if (recorder.isDrawing) strokes.push(recorder.finish());
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    cast();
  }
});

function cast(): void {
  const groups = clusterStrokes(strokes, CONFIG.clusterGapPx);
  const results: MatchResult[] = [];
  for (const group of groups) {
    const points = group.flatMap((s) => s.points);
    const match = recognize(points, GLYPHS);
    if (match) results.push(match);
  }

  const outcome = resolveCast(results);
  hud.showCast(outcome);

  if (outcome.kind !== 'fizzle') {
    const all = strokes.flatMap((s) => s.points);
    const box = boundingBox(all);
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    effects.burst(cx, cy, colorFor(outcome.id), outcome.power);
  }

  strokes.length = 0; // очистить буфер и холст
}

let last = performance.now();
function loop(now: number): void {
  const dt = now - last;
  last = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  effects.update(dt);
  effects.draw(ctx);
  for (const s of strokes) drawInk(ctx, s.points);
  if (recorder.isDrawing) drawInk(ctx, recorder.current);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

- [ ] **Step 2: Проверить, что сборка снова зелёная**

Run: `npm run build`
Expected: PASS без ошибок типов, `dist/` собирается. (Если tsc ругается на неиспользуемый импорт — убрать его.)

- [ ] **Step 3: Прогнать полный набор тестов**

Run: `npm test`
Expected: PASS — geometry (7), stroke (4), clustering (4), recognizer (4), combo (4), cast (8).

- [ ] **Step 4: Ручная проверка в браузере**

Run: `npm run dev`, открыть `http://localhost:5173`.
Чек-лист:
- [ ] нарисованные линии остаются на холсте (не исчезают при отпускании);
- [ ] треугольник + пробел → «Заклинание: Огонь · сила N%»;
- [ ] глиф можно дорисовать несколькими линиями перед пробелом;
- [ ] два глифа рядом (огонь и воздух) + пробел → «КОМБО: Огненный вихрь»;
- [ ] вода + щит → «КОМБО: Лечащий барьер»;
- [ ] три глифа + пробел → «Осечка: Пока не больше двух глифов»;
- [ ] два несочетающихся (огонь+вода) → «Осечка: Эти глифы не сочетаются»;
- [ ] после каста холст очищается; частицы вылетают нужного цвета.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts
git commit -m "feat: мульти-штриховой ввод и каст по пробелу"
```

---

## Task 9: Документация под v2

**Files:**
- Modify: `docs/roadmap.md`, `docs/architecture.md`, `README.md`, `CLAUDE.md`, `AGENTS.md`

- [ ] **Step 1: Заменить `docs/roadmap.md`**

```markdown
# Дорожная карта

## Сделано
- Песочница: рисование, распознавание, точность, одиночные заклинания.
- 6 стихий, мульти-штриховой ввод, каст по пробелу, комбо из двух глифов.

## Идеи на потом
1. **Сложные заклинания из 5–6+ глифов**, где тип определяется размером,
   направлением и взаимным расположением глифов (как в аниме «Академия
   колдовских колпаков»).
2. Кулдауны и мана как ограничители каста.
3. Красивая стилизация глифов под WHA (сейчас — простые формы).
4. Бой с ботом: HP, урон, условие победы.
5. Онлайн-PvP: Python-сервер (FastAPI) — матчмейкинг, синхронизация.
6. Аккаунты и рейтинг.
```

- [ ] **Step 2: Заменить раздел «Модули» и «Поток данных» в `docs/architecture.md`**

Полностью заменить содержимое файла на:

```markdown
# Архитектура

Чистый TypeScript без игрового движка. Модули изолированы и общаются через
простые интерфейсы.

## Модули
- `geometry.ts` — `Point`, расстояние, длина пути, `boundingBox`, `boxGap`.
- `drawing/stroke.ts` — `StrokeRecorder`: накопление точек в `Stroke`. Без DOM.
- `drawing/canvas-renderer.ts` — отрисовка следа чернил.
- `recognition/glyphs.ts` — эталоны 6 стихий.
- `recognition/recognizer.ts` — алгоритм $P: `recognize(points, templates)`.
- `recognition/clustering.ts` — `clusterStrokes`: группировка линий по близости.
- `spells/combo.ts` — `findCombo(a, b)`: поиск комбо в любом порядке.
- `spells/cast.ts` — `resolveCast(results)`: одиночное/комбо/осечка + сила.
- `effects/effects.ts` — система частиц, цвета по id.
- `ui/hud.ts` — текстовая обратная связь (`showCast`).
- `config.ts` — крутилки баланса (`minScore`, `clusterGapPx`).
- `main.ts` — буфер линий, отрисовка, каст по пробелу.

## Поток данных
ввод указателя → `StrokeRecorder` → буфер линий → (пробел) →
`clusterStrokes` → `recognize` по группам → `resolveCast` → `EffectSystem` + `Hud`.

## Что тестируется
Чистые модули (geometry, stroke, clustering, recognizer, combo, cast) —
юнит-тестами Vitest. Визуальные модули — вручную в браузере.
```

- [ ] **Step 3: Обновить раздел «Как играть» в `README.md`**

Заменить блок «## Как играть» на:

```markdown
## Как играть

Зажми мышь/палец и рисуй глифы (можно несколькими линиями):
△ огонь · ~ вода · ◠ воздух · □ земля · ⚡ молния · ○ щит.
Нажми **ПРОБЕЛ** — заклинание распознается и сработает.
Нарисуй два глифа рядом и нажми пробел для комбо: огонь+воздух = огненный вихрь,
вода+молния = шторм, земля+огонь = магма, вода+щит = лечащий барьер.
```

- [ ] **Step 4: Обновить строку механики в `CLAUDE.md` и `AGENTS.md`**

В обоих файлах заменить строку:

```
(рисование глифов, распознавание, точность/скорость, комбо).
```

на:

```
(рисование глифов несколькими линиями, распознавание 6 стихий, каст по пробелу, комбо).
```

- [ ] **Step 5: Commit**

```bash
git add docs/roadmap.md docs/architecture.md README.md CLAUDE.md AGENTS.md
git commit -m "docs: документация под механику v2"
```

---

## Финальная проверка

- [ ] **Step 1: Полный прогон тестов**

Run: `npm test`
Expected: все PASS (geometry, stroke, clustering, recognizer, combo, cast). Файла `spell-system.test.ts` больше нет.

- [ ] **Step 2: Сборка**

Run: `npm run build`
Expected: PASS, `dist/` создаётся.

- [ ] **Step 3: Ручная проверка**

Пройти чек-лист из Task 8, Step 4.

- [ ] **Step 4: Чистота дерева**

Run: `git status`
Expected: рабочее дерево чистое.
