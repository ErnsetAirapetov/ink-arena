# Combat MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить минимальный бой — персонаж-кастер, тренировочный манекен с HP, нанесение урона заклинанием и анимация попадания (вспышка, тряска, цифра урона) с авто-респавном манекена.

**Architecture:** Чистый модуль `combat/combat.ts` (HP/урон, под Vitest) + визуальный `combat/scene.ts` (отрисовка и анимации, проверка в браузере). Проводка в `main.ts`: на успешном заклинании урон применяется к манекену, запускается анимация, частицы бьют по манекену; при HP=0 — таймер респавна. Баланс — в `config.ts`.

**Tech Stack:** TypeScript, HTML5 Canvas, Vite, Vitest.

---

## Структура файлов

- `src/config.ts` — **изменить**: блок `combat` (HP, множитель урона, респавн).
- `src/combat/combat.ts` — **создать**: чистая логика HP/урона. Одна ответственность — числовая модель боя.
- `tests/combat.test.ts` — **создать**: юнит-тесты чистого модуля.
- `src/combat/scene.ts` — **создать**: отрисовка игрока/манекена/HP-бара и состояние анимаций. Одна ответственность — визуализация боя.
- `src/main.ts` — **изменить**: проводка боя в игровой цикл и обработчик ввода.
- `docs/architecture.md` — **изменить**: задокументировать модуль `combat`.

---

## Task 1: Блок баланса `combat` в config

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Добавить блок `combat` в объект CONFIG**

В `src/config.ts` внутри объекта `CONFIG`, после блока `speed`, добавить:

```ts
  /** Параметры боя. */
  combat: {
    /** HP тренировочного манекена. */
    dummyHp: 100,
    /** Множитель урона от точности заклинания (power 100 → 60 урона). */
    damagePerPower: 0.6,
    /** Задержка авто-респавна манекена после смерти, мс. */
    respawnMs: 1500,
  },
```

Результат — файл целиком:

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
  /** Параметры боя. */
  combat: {
    /** HP тренировочного манекена. */
    dummyHp: 100,
    /** Множитель урона от точности заклинания (power 100 → 60 урона). */
    damagePerPower: 0.6,
    /** Задержка авто-респавна манекена после смерти, мс. */
    respawnMs: 1500,
  },
} as const;

export type SpeedTier = 'fast' | 'normal' | 'slow';
```

- [ ] **Step 2: Проверить сборку типов**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: блок баланса боя в config"
```

---

## Task 2: Чистый модуль `combat.ts` (TDD)

**Files:**
- Test: `tests/combat.test.ts`
- Create: `src/combat/combat.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `tests/combat.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createCombatant, damageFor, applyDamage, respawn } from '../src/combat/combat';
import type { Spell } from '../src/spells/spell-system';

const spell = (power: number): Spell => ({
  elementId: 'fire',
  element: 'Огонь',
  power,
  speed: 'normal',
  success: true,
});

describe('combat', () => {
  it('createCombatant — полный HP и жив', () => {
    expect(createCombatant(100)).toEqual({ hp: 100, maxHp: 100, alive: true });
  });

  it('damageFor — урон зависит от точности (power × 0.6)', () => {
    expect(damageFor(spell(100))).toBe(60);
    expect(damageFor(spell(50))).toBe(30);
  });

  it('applyDamage — снимает HP, остаётся жив', () => {
    const c = applyDamage(createCombatant(100), 30);
    expect(c.hp).toBe(70);
    expect(c.alive).toBe(true);
  });

  it('applyDamage — обрезает HP по 0 и помечает мёртвым', () => {
    const c = applyDamage(createCombatant(50), 80);
    expect(c.hp).toBe(0);
    expect(c.alive).toBe(false);
  });

  it('applyDamage — не мутирует входной объект', () => {
    const orig = createCombatant(100);
    applyDamage(orig, 40);
    expect(orig.hp).toBe(100);
  });

  it('respawn — восстанавливает полный HP', () => {
    const dead = applyDamage(createCombatant(100), 200);
    expect(respawn(dead)).toEqual({ hp: 100, maxHp: 100, alive: true });
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -- combat`
Expected: FAIL — модуль `../src/combat/combat` не найден.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `src/combat/combat.ts`:

```ts
import { CONFIG } from '../config';
import type { Spell } from '../spells/spell-system';

export interface Combatant {
  hp: number;
  maxHp: number;
  alive: boolean;
}

/** Создать бойца с полным HP. */
export function createCombatant(maxHp: number): Combatant {
  return { hp: maxHp, maxHp, alive: true };
}

/** Урон заклинания: зависит только от точности (power). */
export function damageFor(spell: Spell): number {
  return Math.round(spell.power * CONFIG.combat.damagePerPower);
}

/** Применить урон. Возвращает нового бойца, вход не мутирует. */
export function applyDamage(c: Combatant, amount: number): Combatant {
  const hp = Math.max(0, Math.min(c.maxHp, c.hp - amount));
  return { hp, maxHp: c.maxHp, alive: hp > 0 };
}

/** Воскресить с полным HP. */
export function respawn(c: Combatant): Combatant {
  return { hp: c.maxHp, maxHp: c.maxHp, alive: true };
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -- combat`
Expected: PASS — 6 тестов.

- [ ] **Step 5: Commit**

```bash
git add tests/combat.test.ts src/combat/combat.ts
git commit -m "feat: чистый модуль боя (HP, урон, респавн)"
```

---

## Task 3: Визуальный модуль `scene.ts`

**Files:**
- Create: `src/combat/scene.ts`

Проверяется вручную в браузере (визуальный модуль, без юнит-тестов — по соглашению проекта).

- [ ] **Step 1: Создать `src/combat/scene.ts`**

```ts
import type { Combatant } from './combat';

interface Floater {
  value: number;
  x: number;
  y: number;
  life: number; // 1..0
}

export interface Size {
  w: number;
  h: number;
}

/**
 * Рисует сцену боя (игрок-кастер слева, манекен справа, HP-бар) и держит
 * транзитное состояние анимаций. Логическое состояние HP передаётся снаружи.
 */
export class CombatScene {
  private flash = 0; // 0..1 интенсивность вспышки попадания
  private shake = 0; // амплитуда тряски манекена (px)
  private floaters: Floater[] = [];
  private dummyPos = { x: 0, y: 0 };

  /** Текущая позиция манекена — для привязки взрыва частиц. */
  get target(): { x: number; y: number } {
    return this.dummyPos;
  }

  /** Запустить анимацию попадания с числом урона. */
  hit(amount: number): void {
    this.flash = 1;
    this.shake = 12;
    this.floaters.push({
      value: amount,
      x: this.dummyPos.x,
      y: this.dummyPos.y - 60,
      life: 1,
    });
  }

  /** Продвинуть таймеры анимаций. */
  update(dtMs: number): void {
    const k = dtMs / 1000;
    this.flash = Math.max(0, this.flash - k * 3);
    this.shake = Math.max(0, this.shake - k * 40);
    for (const f of this.floaters) {
      f.y -= dtMs * 0.03;
      f.life -= k * 1.2;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, dummy: Combatant, size: Size): void {
    const playerX = size.w * 0.2;
    const dummyX = size.w * 0.75;
    const groundY = size.h * 0.7;
    this.dummyPos = { x: dummyX, y: groundY - 80 };

    this.drawCaster(ctx, playerX, groundY);
    this.drawDummy(ctx, dummyX, groundY, dummy);
    this.drawFloaters(ctx);
  }

  private drawCaster(ctx: CanvasRenderingContext2D, x: number, groundY: number): void {
    ctx.save();
    ctx.strokeStyle = '#9fb4ff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, groundY - 90, 16, 0, 2 * Math.PI); // голова
    ctx.moveTo(x, groundY - 74);
    ctx.lineTo(x, groundY - 24); // туловище
    ctx.moveTo(x, groundY - 24);
    ctx.lineTo(x - 16, groundY); // левая нога
    ctx.moveTo(x, groundY - 24);
    ctx.lineTo(x + 16, groundY); // правая нога
    ctx.moveTo(x, groundY - 60);
    ctx.lineTo(x + 30, groundY - 72); // рука, указывающая на манекен
    ctx.stroke();
    ctx.restore();
  }

  private drawDummy(
    ctx: CanvasRenderingContext2D,
    x: number,
    groundY: number,
    dummy: Combatant,
  ): void {
    const shakeX = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const cx = x + shakeX;

    ctx.save();
    ctx.globalAlpha = dummy.alive ? 1 : 0.3; // мёртвый — призрачный до респавна

    // столб
    ctx.fillStyle = '#6b4f3a';
    ctx.fillRect(cx - 8, groundY - 70, 16, 70);
    // перекладина-руки
    ctx.fillRect(cx - 35, groundY - 58, 70, 10);
    // голова-мешок
    ctx.fillStyle = '#caa472';
    ctx.beginPath();
    ctx.arc(cx, groundY - 80, 22, 0, 2 * Math.PI);
    ctx.fill();

    // вспышка попадания поверх
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash * 0.6;
      ctx.fillStyle = '#ff5050';
      ctx.beginPath();
      ctx.arc(cx, groundY - 80, 30, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();

    this.drawHpBar(ctx, cx, groundY - 120, dummy);
  }

  private drawHpBar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    y: number,
    dummy: Combatant,
  ): void {
    const w = 90;
    const h = 10;
    const x = cx - w / 2;
    const ratio = dummy.hp / dummy.maxHp;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = ratio > 0.3 ? '#4ad36b' : '#d34a4a';
    ctx.fillRect(x, y, w * ratio, h);
    ctx.fillStyle = '#fff';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${dummy.hp}/${dummy.maxHp}`, cx, y - 6);
    ctx.restore();
  }

  private drawFloaters(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = '#ffd23d';
      ctx.fillText(`-${f.value}`, f.x, f.y);
    }
    ctx.restore();
  }
}
```

- [ ] **Step 2: Проверить сборку типов**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/combat/scene.ts
git commit -m "feat: визуальная сцена боя (игрок, манекен, HP-бар, анимации)"
```

---

## Task 4: Проводка боя в `main.ts`

**Files:**
- Modify: `src/main.ts`

Визуальный модуль — проверка в браузере. Заменить содержимое `src/main.ts` целиком на версию ниже. Блоки боя помечены комментариями `--- combat ---` для упрощения merge с агентом по рисованию.

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
import { CONFIG } from './config';
import { createCombatant, damageFor, applyDamage, respawn } from './combat/combat';
import { CombatScene } from './combat/scene';

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

// --- combat ---
let dummy = createCombatant(CONFIG.combat.dummyHp);
const scene = new CombatScene();
let respawnAt: number | null = null;
// --- /combat ---

canvas.addEventListener('pointerdown', (e) => {
  recorder.start(e.clientX, e.clientY, e.timeStamp);
});
canvas.addEventListener('pointermove', (e) => {
  if (recorder.isDrawing) recorder.add(e.clientX, e.clientY, e.timeStamp);
});
canvas.addEventListener('pointerup', (e) => {
  if (!recorder.isDrawing) return;
  const stroke = recorder.finish();
  const match = recognize(stroke.points, GLYPHS);
  if (!match) return;

  const spell = buildSpell(match, stroke.duration);

  if (!spell.success) {
    hud.showSpell(spell);
    return;
  }

  const result = combo.push(spell.elementId, e.timeStamp);
  const colorId = result.type === 'combo' ? result.combo.id : spell.elementId;
  if (result.type === 'combo') {
    hud.showCombo(result.combo.name, spell.power);
  } else {
    hud.showSpell(spell);
  }

  // --- combat: нанести урон манекену ---
  if (dummy.alive) {
    const dmg = damageFor(spell);
    dummy = applyDamage(dummy, dmg);
    scene.hit(dmg);
    effects.burst(scene.target.x, scene.target.y, colorFor(colorId), spell.power);
    if (!dummy.alive) respawnAt = e.timeStamp + CONFIG.combat.respawnMs;
  }
  // --- /combat ---
});

let last = performance.now();
function loop(now: number): void {
  const dt = now - last;
  last = now;

  // --- combat: авто-респавн манекена ---
  if (respawnAt !== null && now >= respawnAt) {
    dummy = respawn(dummy);
    respawnAt = null;
  }
  // --- /combat ---

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  scene.update(dt);
  scene.draw(ctx, dummy, { w: canvas.width, h: canvas.height });
  effects.update(dt);
  effects.draw(ctx);
  if (recorder.isDrawing) drawInk(ctx, recorder.current);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

- [ ] **Step 2: Проверить сборку типов**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 3: Прогнать все тесты**

Run: `npm test`
Expected: PASS — все наборы, включая `combat` (6 тестов).

- [ ] **Step 4: Ручная проверка в браузере**

Run: `npm run dev -- --port 5174`
Проверить:
- слева фигура-кастер, справа манекен с HP-баром `100/100`;
- нарисовать △ (огонь) → манекен мигает красным, дёргается, всплывает `-N`, HP падает, частицы бьют по манекену;
- два точных попадания → HP=0, манекен бледнеет → через ~1.5 с восстанавливается до `100/100`;
- провальное (неточное) заклинание HP не снимает.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts
git commit -m "feat: проводка боя — урон по манекену, анимация, респавн"
```

---

## Task 5: Документация архитектуры

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Добавить модуль combat в список модулей**

В `docs/architecture.md` в разделе `## Модули`, после строки про `effects/effects.ts`, добавить:

```markdown
- `combat/combat.ts` — чистая логика боя: `Combatant` (HP), `damageFor`, `applyDamage`, `respawn`.
- `combat/scene.ts` — `CombatScene`: отрисовка игрока, манекена, HP-бара и анимаций попадания.
```

- [ ] **Step 2: Обновить поток данных**

В разделе `## Поток данных` заменить строку про эффекты на:

```markdown
ввод указателя → `StrokeRecorder` → `recognize()` → `buildSpell()` →
`ComboTracker.push()` → `damageFor()` → `applyDamage()` → `CombatScene` +
`EffectSystem` + `Hud`.
```

- [ ] **Step 3: Дополнить список тестируемого**

В разделе `## Что тестируется` в перечень чистых модулей добавить `combat`:

```markdown
Чистые модули (geometry, stroke, recognizer, spell-system, combo, combat) —
юнит-тестами Vitest. Визуальные модули — вручную в браузере.
```

- [ ] **Step 4: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: модуль боя в архитектуре"
```

---

## Self-review

- **Покрытие спеки:** манекен с HP (Task 1, 2), персонаж-кастер (Task 3), урон по точности (Task 2 `damageFor`), применение урона (Task 4), анимация вспышка+тряска+цифра (Task 3), частицы по манекену (Task 4), авто-респавн (Task 1 `respawnMs`, Task 2 `respawn`, Task 4 таймер) — всё покрыто.
- **Типы согласованы:** `Combatant`, `createCombatant`, `damageFor`, `applyDamage`, `respawn`, `CombatScene.hit/update/draw/target`, `Size` используются одинаково во всех задачах.
- **Плейсхолдеров нет:** весь код приведён полностью.
