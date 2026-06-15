# Подложка-обводка + различимые глифы Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать распознавание надёжнее для кривого рисунка (различить воздух и щит, снизить порог) и добавить полупрозрачную подложку-обводку с гост-глифами и легендой комбо, тоглящуюся клавишей G.

**Architecture:** Чистый TypeScript, существующая модульная структура. Меняется форма глифа `air` и порог `minScore`. Добавляется визуальный слой `ui/guide.ts` (класс `GuideOverlay`) с чистым хелпером `fitPointsToBox`, который покрывается юнит-тестом; сам оверлей проверяется в браузере.

**Tech Stack:** TypeScript, HTML5 Canvas, Vite, Vitest.

**Спека:** `docs/superpowers/specs/2026-06-15-guide-overlay-design.md`

**Соглашения:** Conventional Commits на русском; автор только владелец (`eriktarakan@gmail.com`), без упоминания ассистентов.

---

## Карта файлов

Создаётся:
- `src/ui/guide.ts` — `fitPointsToBox` (чистая) + класс `GuideOverlay` (визуал).
- `tests/guide.test.ts` — юнит-тест `fitPointsToBox`.

Меняется:
- `src/recognition/glyphs.ts` — новая форма `air` (вертикальная волна).
- `src/config.ts` — `minScore: 0.4 → 0.3` (остальное, включая блок `combat`, без изменений).
- `src/main.ts` — клавиша `KeyG` → `guide.toggle()`; отрисовка `GuideOverlay` фоном.
- `docs/spells.md`, `README.md` — новая форма воздуха и клавиша G.

Не меняется: `recognizer.ts`, `cast.ts`, `combo.ts`, `combat/*`, `effects.ts`, `hud.ts`, `clustering.ts`, `stroke.ts`, `geometry.ts`.

---

## Task 1: Новая форма воздуха (вертикальная волна)

**Files:**
- Modify: `src/recognition/glyphs.ts`

Существующий тест `tests/recognizer.test.ts` уже перебирает все глифы и проверяет, что каждый эталон узнаётся как сам себя — он автоматически покроет новую форму воздуха. Спираль-хелпер `spiral` больше не нужен и удаляется (иначе `noUnusedLocals` уронит сборку).

- [ ] **Step 1: Заменить блок `air` и удалить функцию `spiral` в `src/recognition/glyphs.ts`**

Заменить объект глифа `air`:

```ts
  {
    id: 'air',
    name: 'Воздух',
    // Спираль ◠
    points: spiral(50, 50, 2.5, 24),
  },
```

на:

```ts
  {
    id: 'air',
    name: 'Воздух',
    // Вертикальная волна ⌇ (горизонтальная волна, повёрнутая на 90°)
    points: [p(50, 0), p(90, 20), p(50, 40), p(10, 60), p(50, 80), p(90, 100)],
  },
```

Затем удалить целиком неиспользуемую функцию `spiral`:

```ts
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
```

(Функция `circle` остаётся — её использует `shield`.)

- [ ] **Step 2: Прогнать распознаватель — убедиться, что зелёный**

Run: `npm test -- recognizer`
Expected: PASS (4 теста). Цикл «каждый эталон узнаётся как сам себя» теперь включает воздух-волну (score ≈ 1, id = `air`).

- [ ] **Step 3: Проверить сборку (нет неиспользуемого `spiral`)**

Run: `npm run build`
Expected: PASS без ошибок типов.

- [ ] **Step 4: Commit**

```bash
git add src/recognition/glyphs.ts
git commit -m "feat: воздух — вертикальная волна вместо спирали (меньше путается с кругом)"
```

---

## Task 2: Снизить порог точности

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Поменять `minScore` в `src/config.ts`**

Заменить строку:

```ts
  minScore: 0.4,
```

на:

```ts
  minScore: 0.3,
```

(Остальные поля, включая блок `combat`, не трогать.)

- [ ] **Step 2: Прогнать все тесты**

Run: `npm test`
Expected: PASS. Тесты `cast` используют значения score 0.2/0.6/0.8/0.9 — при пороге 0.3 поведение тех кейсов не меняется (0.2 < 0.3 — осечка; остальные ≥ 0.3 как и раньше).

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "balance: снизить minScore до 0.3 (снисходительнее к кривому рисунку)"
```

---

## Task 3: Хелпер `fitPointsToBox`

**Files:**
- Create: `src/ui/guide.ts`
- Test: `tests/guide.test.ts`

`fitPointsToBox(points, box, padding)` — вписывает точки глифа в прямоугольную рамку: равномерный масштаб (сохраняет пропорцию) + центрирование внутри рамки с отступом.

- [ ] **Step 1: Написать падающий тест**

`tests/guide.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fitPointsToBox } from '../src/ui/guide';
import type { Point } from '../src/geometry';

const p = (x: number, y: number): Point => ({ x, y, t: 0 });
const square = [p(0, 0), p(10, 0), p(10, 10), p(0, 10)];

describe('fitPointsToBox', () => {
  it('вписывает квадрат в высокую рамку с центрированием по вертикали', () => {
    const box = { minX: 0, minY: 0, maxX: 100, maxY: 200 };
    const out = fitPointsToBox(square, box, 0);
    expect(out).toEqual([
      { x: 0, y: 50, t: 0 },
      { x: 100, y: 50, t: 0 },
      { x: 100, y: 150, t: 0 },
      { x: 0, y: 150, t: 0 },
    ]);
  });

  it('учитывает отступ', () => {
    const box = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    const out = fitPointsToBox(square, box, 10);
    expect(out[0]).toEqual({ x: 10, y: 10, t: 0 });
    expect(out[2]).toEqual({ x: 90, y: 90, t: 0 });
  });

  it('все точки остаются внутри рамки', () => {
    const box = { minX: 5, minY: 5, maxX: 125, maxY: 95 };
    const out = fitPointsToBox(square, box, 8);
    for (const pt of out) {
      expect(pt.x).toBeGreaterThanOrEqual(5);
      expect(pt.x).toBeLessThanOrEqual(125);
      expect(pt.y).toBeGreaterThanOrEqual(5);
      expect(pt.y).toBeLessThanOrEqual(95);
    }
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `npm test -- guide`
Expected: FAIL — модуль `../src/ui/guide` не найден.

- [ ] **Step 3: Создать `src/ui/guide.ts` с функцией**

```ts
import { boundingBox, type Box, type Point } from '../geometry';

/**
 * Вписывает точки в рамку box с отступом padding: равномерный масштаб
 * (сохраняет пропорцию) и центрирование внутри доступной области.
 */
export function fitPointsToBox(points: Point[], box: Box, padding: number): Point[] {
  const src = boundingBox(points);
  const srcW = src.maxX - src.minX || 1;
  const srcH = src.maxY - src.minY || 1;

  const innerX = box.minX + padding;
  const innerY = box.minY + padding;
  const innerW = box.maxX - box.minX - padding * 2;
  const innerH = box.maxY - box.minY - padding * 2;

  const scale = Math.min(innerW / srcW, innerH / srcH);
  const offsetX = innerX + (innerW - srcW * scale) / 2;
  const offsetY = innerY + (innerH - srcH * scale) / 2;

  return points.map((pt) => ({
    x: offsetX + (pt.x - src.minX) * scale,
    y: offsetY + (pt.y - src.minY) * scale,
    t: 0,
  }));
}
```

- [ ] **Step 4: Прогнать — убедиться, что проходит**

Run: `npm test -- guide`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add src/ui/guide.ts tests/guide.test.ts
git commit -m "feat: fitPointsToBox — вписать точки глифа в рамку"
```

---

## Task 4: Класс `GuideOverlay`

**Files:**
- Modify: `src/ui/guide.ts` (дописать класс после `fitPointsToBox`)

Визуальный модуль (проверяется в браузере в Task 5). Рисует ряд гост-карточек глифов и легенду комбо ниже них.

- [ ] **Step 1: Дописать в конец `src/ui/guide.ts`**

```ts
import { GLYPHS } from '../recognition/glyphs';
import { COMBOS } from '../spells/combo';

export interface Size {
  w: number;
  h: number;
}

const GHOST = '#cfe0ff';
const TEXT = '#e8eaf0';

export class GuideOverlay {
  visible = true;

  toggle(): void {
    this.visible = !this.visible;
  }

  draw(ctx: CanvasRenderingContext2D, size: Size): void {
    if (!this.visible) return;
    ctx.save();
    ctx.textAlign = 'center';
    const cardsBottom = this.drawGlyphCards(ctx, size);
    this.drawComboLegend(ctx, cardsBottom + 24);
    ctx.restore();
  }

  /** Рисует ряд(ы) гост-карточек, возвращает нижнюю координату блока. */
  private drawGlyphCards(ctx: CanvasRenderingContext2D, size: Size): number {
    const margin = 20;
    const gap = 14;
    const perRow = size.w < 760 ? 3 : 6;
    const cardW = Math.min(120, (size.w - margin * 2 - gap * (perRow - 1)) / perRow);
    const cardH = cardW;
    const labelH = 28;
    let bottom = 0;

    GLYPHS.forEach((g, i) => {
      const r = Math.floor(i / perRow);
      const c = i % perRow;
      const x = margin + c * (cardW + gap);
      const y = 24 + r * (cardH + labelH);
      const box = { minX: x, minY: y, maxX: x + cardW, maxY: y + cardH };

      // рамка карточки
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = GHOST;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cardW, cardH);

      // гост-контур глифа
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = GHOST;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const pts = fitPointsToBox(g.points, box, 16);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
      ctx.stroke();

      // подпись
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = TEXT;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(g.name, x + cardW / 2, y + cardH + 16);

      bottom = Math.max(bottom, y + cardH + labelH);
    });

    return bottom;
  }

  private glyphName(id: string): string {
    return GLYPHS.find((g) => g.id === id)?.name ?? id;
  }

  private drawComboLegend(ctx: CanvasRenderingContext2D, top: number): void {
    const x = 20;
    let y = top;
    ctx.textAlign = 'left';
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = TEXT;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('Комбо (нарисуй два глифа рядом):', x, y);
    y += 20;
    ctx.font = '12px system-ui, sans-serif';
    for (const combo of COMBOS) {
      const a = this.glyphName(combo.parts[0]);
      const b = this.glyphName(combo.parts[1]);
      ctx.fillText(`${a} + ${b} = ${combo.name}`, x, y);
      y += 18;
    }
  }
}
```

- [ ] **Step 2: Проверить сборку**

Run: `npm run build`
Expected: PASS без ошибок типов.

- [ ] **Step 3: Commit**

```bash
git add src/ui/guide.ts
git commit -m "feat: GuideOverlay — гост-глифы и легенда комбо"
```

---

## Task 5: Подключить подложку в main.ts (тогл G + отрисовка)

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Прочитать текущий `src/main.ts`**

Открыть файл и найти: блок импортов, обработчик `keydown`, функцию `loop`. (Файл изменён модулем боя — ориентироваться на актуальное содержимое.)

- [ ] **Step 2: Добавить импорт `GuideOverlay`**

После строки импорта HUD:

```ts
import { Hud } from './ui/hud';
```

добавить:

```ts
import { GuideOverlay } from './ui/guide';
```

- [ ] **Step 3: Создать экземпляр оверлея**

Рядом с созданием эффектов/сцены (после `const effects = new EffectSystem();`) добавить:

```ts
const guide = new GuideOverlay();
```

- [ ] **Step 4: Добавить тогл по клавише G**

В обработчике `keydown` (где обрабатывается `Space`) добавить ветку для `KeyG`. Итоговый обработчик:

```ts
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    cast();
  }
  if (e.code === 'KeyG') {
    guide.toggle();
  }
});
```

- [ ] **Step 5: Рисовать подложку фоном в цикле**

В функции `loop`, сразу после `ctx.clearRect(...)` и до отрисовки сцены боя, добавить строку:

```ts
  guide.draw(ctx, { w: canvas.width, h: canvas.height });
```

Порядок отрисовки в кадре: `clearRect` → `guide.draw` → `scene.draw` → `effects.draw` → чернила. Так подложка остаётся фоном под всем остальным.

- [ ] **Step 6: Проверить сборку**

Run: `npm run build`
Expected: PASS без ошибок типов.

- [ ] **Step 7: Ручная проверка в браузере**

Run: `npm run dev`, открыть `http://localhost:5173`.
Чек-лист:
- [ ] сверху видны 6 полупрозрачных гост-карточек с контурами и подписями;
- [ ] ниже — легенда из 4 комбо;
- [ ] клавиша **G** прячет и показывает подложку;
- [ ] обводка карточки «Огонь» + пробел → «Заклинание: Огонь» с высокой силой;
- [ ] воздух (вертикальная волна) распознаётся и не путается с щитом (кругом);
- [ ] обводка карточек огонь и воздух (рядом, с промежутком) + пробел → «КОМБО: Огненный вихрь»;
- [ ] подложка не перекрывает манекен/HP-бар снизу.

- [ ] **Step 8: Commit**

```bash
git add src/main.ts
git commit -m "feat: подложка-обводка в игре, тогл по клавише G"
```

---

## Task 6: Документация

**Files:**
- Modify: `docs/spells.md`, `README.md`

- [ ] **Step 1: Обновить форму воздуха и управление в `docs/spells.md`**

Заменить строку таблицы воздуха:

```
| 🌪 Воздух | `air` | ◠ спираль | закрученная спираль из центра наружу (~2.5 витка) |
```

на:

```
| 🌪 Воздух | `air` | ⌇ вертикальная волна | волнистая линия сверху вниз |
```

И добавить в конец файла раздел:

```markdown
## Управление

- Рисуй глифы мышью/пальцем, **ПРОБЕЛ** — каст.
- **G** — показать/скрыть подложку-обводку (гост-глифы и легенду комбо).
  По умолчанию включена: обведи гост-контур, чтобы получить почти 100% точности.
```

- [ ] **Step 2: Обновить символ воздуха и добавить G в `README.md`**

В блоке «## Как играть» заменить `◠ воздух` на `⌇ воздух`, и добавить строку про подсказку. Итоговый блок:

```markdown
## Как играть

Зажми мышь/палец и рисуй глифы (можно несколькими линиями):
△ огонь · ~ вода · ⌇ воздух · □ земля · ⚡ молния · ○ щит.
Нажми **ПРОБЕЛ** — заклинание распознается и сработает.
Нарисуй два глифа рядом и нажми пробел для комбо: огонь+воздух = огненный вихрь,
вода+молния = шторм, земля+огонь = магма, вода+щит = лечащий барьер.
Клавиша **G** показывает/скрывает подложку-обводку с идеальными глифами.
```

- [ ] **Step 3: Commit**

```bash
git add docs/spells.md README.md
git commit -m "docs: воздух-волна и клавиша G в справке"
```

---

## Финальная проверка

- [ ] **Step 1: Полный прогон тестов**

Run: `npm test`
Expected: все PASS (geometry, stroke, clustering, recognizer, combo, cast, combat, guide).

- [ ] **Step 2: Сборка**

Run: `npm run build`
Expected: PASS, `dist/` создаётся.

- [ ] **Step 3: Ручная проверка**

Пройти чек-лист из Task 5, Step 7.

- [ ] **Step 4: Чистота дерева**

Run: `git status`
Expected: рабочее дерево чистое.
