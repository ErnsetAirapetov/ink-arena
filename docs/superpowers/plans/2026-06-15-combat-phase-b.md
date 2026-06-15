# Боевая система — Фаза B: двусторонний бой и грамматика защиты Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать бой двусторонним (манекен бьёт в ответ с телеграфом стихии, у игрока есть HP), щиты реально снижают урон со сродством, а заклинания разбираются типизованным парсером (щит — модификатор; базовый и стихийный щиты).

**Architecture:** Сначала добавляются чистые модули и поля (аддитивно, сборка зелёная): блок урона, поля снаряда, парсер `spell-types`, ИИ манекена, расширение игрока с обратно-совместимыми сигнатурами. Затем одна задача-интеграция переключает `main.ts`/`ui/hud.ts` на новый парсер и подключает двусторонний бой, удаляя старый `resolveCast`. Каждый коммит компилируется.

**Tech Stack:** TypeScript, Vite, Vitest.

**Спека:** `docs/superpowers/specs/2026-06-15-combat-phase-b-design.md`

**Соглашения:** Conventional Commits на русском; автор только владелец (`eriktarakan@gmail.com`), без упоминания ассистентов.

---

## Карта файлов

Создаётся:
- `src/spells/spell-types.ts` — `Spell`, `parseSpell(results)`.
- `src/combat/dummy-ai.ts` — `DummyAi`, машина состояний телеграф→выстрел→пауза.
- `tests/spell-types.test.ts`, `tests/dummy-ai.test.ts`.

Меняется:
- `src/config.ts` — поля боя (HP игрока, урон/тайминги манекена, блок щита).
- `src/combat/combat.ts` — `blockedDamage(shieldElement, raw, attackElement)`.
- `src/combat/projectile.ts` — поля `target` и `element` у снаряда/прилёта.
- `src/combat/player.ts` — HP, стихия щита, урон по игроку, респавн.
- `src/spells/combo.ts` — убрать `healing-barrier`.
- `src/combat/scene.ts` — HP-бар игрока, иконка-телеграф, попадание по игроку.
- `src/ui/hud.ts` — перевод на тип `Spell`.
- `src/main.ts` — `parseSpell`, цикл ИИ, урон по игроку, маршрутизация.
- `tests/combat.test.ts`, `tests/projectile.test.ts`, `tests/player.test.ts`, `tests/combo.test.ts` — обновления.
- `docs/architecture.md`, `docs/spells.md`.

Удаляется (в задаче интеграции):
- `src/spells/cast.ts`, `tests/cast.test.ts` (логику забирает `spell-types.ts`).

---

## Task 1: Поля боя в конфиге

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Добавить поля в блок `combat` (после `respawnMs`)**

В `src/config.ts` внутри `combat: { ... }`, после строки `respawnMs: 1500,` добавить:

```ts
    /** HP игрока. */
    playerHp: 100,
    /** Задержка авто-респавна игрока после смерти, мс. */
    playerRespawnMs: 1500,
    /** Урон одной атаки манекена по игроку. */
    dummyDamage: 15,
    /** Длительность телеграфа стихии манекена, мс. */
    telegraphMs: 1500,
    /** Пауза между атаками манекена, мс. */
    dummyAttackIntervalMs: 3000,
    /** Базовая доля поглощения урона щитом (0..1). */
    shieldBlock: 0.6,
    /** Верхняя граница доли поглощения. */
    maxBlockFraction: 0.95,
```

- [ ] **Step 2: Проверить сборку**

Run: `npm run build`
Expected: PASS без ошибок типов.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: поля боя для фазы B (HP игрока, атаки манекена, блок щита)"
```

---

## Task 2: Формула блока урона `blockedDamage`

**Files:**
- Modify: `src/combat/combat.ts`
- Test: `tests/combat.test.ts`

- [ ] **Step 1: Дописать тест в конец `tests/combat.test.ts`**

```ts
import { blockedDamage } from '../src/combat/combat';

describe('blockedDamage — поглощение щитом', () => {
  it('базовый щит (без стихии) — блок shieldBlock', () => {
    // 0.6 блок → 100 × 0.4 = 40
    expect(blockedDamage(null, 100, 'fire')).toBe(40);
  });

  it('стихийный щит силён против атаки → больше блок', () => {
    // щит fire против air (fire бьёт air, ×1.5): блок 0.6×1.5=0.9 → 100×0.1=10
    expect(blockedDamage('fire', 100, 'air')).toBe(10);
  });

  it('стихийный щит слаб против атаки → меньше блок', () => {
    // щит air против fire (air слаб, ×0.66): блок 0.6×0.66=0.396 → 100×0.604≈60
    expect(blockedDamage('air', 100, 'fire')).toBe(60);
  });

  it('совпадение стихий щита и атаки → базовый блок', () => {
    expect(blockedDamage('fire', 100, 'fire')).toBe(40);
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `npm test -- combat`
Expected: FAIL — `blockedDamage` не экспортируется.

- [ ] **Step 3: Реализовать в `src/combat/combat.ts`**

Добавить импорт в начало файла (рядом с импортом `CONFIG`):

```ts
import { affinity } from './elements';
```

Добавить функцию в конец файла:

```ts
/**
 * Финальный урон по цели с активным щитом стихии shieldElement (null — базовый).
 * Стихийный щит учитывает сродство против стихии атаки.
 */
export function blockedDamage(
  shieldElement: string | null,
  rawDamage: number,
  attackElement: string,
): number {
  const mult = shieldElement ? affinity(shieldElement, attackElement) : 1;
  const blockFraction = Math.max(
    0,
    Math.min(CONFIG.combat.maxBlockFraction, CONFIG.combat.shieldBlock * mult),
  );
  return Math.round(rawDamage * (1 - blockFraction));
}
```

- [ ] **Step 4: Прогнать — убедиться, что проходит**

Run: `npm test -- combat`
Expected: PASS (старые + 4 новых).

- [ ] **Step 5: Commit**

```bash
git add src/combat/combat.ts tests/combat.test.ts
git commit -m "feat: формула поглощения урона щитом со сродством"
```

---

## Task 3: Поля `target` и `element` у снаряда

**Files:**
- Modify: `src/combat/projectile.ts`
- Test: `tests/projectile.test.ts`

Снаряд получает цель (`'dummy'` или `'player'`) и стихию, чтобы по прилёте знать, кого бить и с каким сродством. Поля опциональны при спавне (дефолт `'dummy'`/`''`), чтобы существующий код продолжал компилироваться.

- [ ] **Step 1: Дописать тест в конец `tests/projectile.test.ts`**

`ProjectileSystem` уже импортирован в начале файла — повторно НЕ импортировать, добавить только блок:

```ts
describe('ProjectileSystem — цель и стихия снаряда', () => {
  it('прилёт несёт target и element', () => {
    const ps = new ProjectileSystem();
    ps.spawn({
      from: { x: 0, y: 0 },
      to: { x: 10, y: 0 },
      flightMs: 100,
      damage: 15,
      colorId: 'fire',
      target: 'player',
      element: 'fire',
    });
    const arrivals = ps.update(200);
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0].target).toBe('player');
    expect(arrivals[0].element).toBe('fire');
  });

  it('по умолчанию target = dummy, element = пусто', () => {
    const ps = new ProjectileSystem();
    ps.spawn({ from: { x: 0, y: 0 }, to: { x: 10, y: 0 }, flightMs: 100, damage: 5, colorId: 'water' });
    const arrivals = ps.update(200);
    expect(arrivals[0].target).toBe('dummy');
    expect(arrivals[0].element).toBe('');
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `npm test -- projectile`
Expected: FAIL — у `Arrival` нет `target`/`element`.

- [ ] **Step 3: Обновить `src/combat/projectile.ts`**

Тип `Target` и поля. Заменить интерфейсы `Projectile`, `Arrival`, `SpawnOpts`:

```ts
export type ProjectileTarget = 'dummy' | 'player';

interface Projectile {
  from: Pt;
  to: Pt;
  control: Pt;
  flightMs: number;
  elapsed: number;
  damage: number;
  colorId: string;
  target: ProjectileTarget;
  element: string;
}

export interface Arrival {
  x: number;
  y: number;
  damage: number;
  colorId: string;
  target: ProjectileTarget;
  element: string;
}

export interface SpawnOpts {
  from: Pt;
  to: Pt;
  flightMs: number;
  damage: number;
  colorId: string;
  target?: ProjectileTarget;
  element?: string;
}
```

В методе `spawn`, в объекте, добавляемом в `this.projectiles`, добавить поля:

```ts
      damage: opts.damage,
      colorId: opts.colorId,
      target: opts.target ?? 'dummy',
      element: opts.element ?? '',
```

В методе `update`, в объекте `arrived.push({...})` добавить поля:

```ts
        arrived.push({
          x: p.to.x,
          y: p.to.y,
          damage: p.damage,
          colorId: p.colorId,
          target: p.target,
          element: p.element,
        });
```

- [ ] **Step 4: Прогнать — убедиться, что проходит**

Run: `npm test -- projectile`
Expected: PASS (старые + 2 новых).

- [ ] **Step 5: Проверить сборку и Commit**

Run: `npm run build`
Expected: PASS (существующий вызов `spawn` в `main.ts` валиден — новые поля опциональны).

```bash
git add src/combat/projectile.ts tests/projectile.test.ts
git commit -m "feat: снаряд несёт цель (dummy/player) и стихию"
```

---

## Task 4: Типизованный парсер `spell-types.ts`

**Files:**
- Create: `src/spells/spell-types.ts`
- Test: `tests/spell-types.test.ts`

- [ ] **Step 1: Написать падающий тест**

`tests/spell-types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseSpell } from '../src/spells/spell-types';
import type { MatchResult } from '../src/recognition/recognizer';

const m = (id: string, name: string, score: number): MatchResult => ({
  glyph: { id, name, points: [] },
  score,
});

describe('parseSpell', () => {
  it('ничего → осечка', () => {
    expect(parseSpell([]).kind).toBe('fizzle');
  });

  it('больше двух → осечка', () => {
    expect(parseSpell([m('fire', 'Огонь', 0.9), m('water', 'Вода', 0.9), m('air', 'Воздух', 0.9)]).kind).toBe('fizzle');
  });

  it('ниже порога → осечка', () => {
    expect(parseSpell([m('fire', 'Огонь', 0.2)]).kind).toBe('fizzle');
  });

  it('одна стихия → атака', () => {
    expect(parseSpell([m('fire', 'Огонь', 0.87)])).toEqual({
      kind: 'attack', element: 'fire', name: 'Огонь', power: 87,
    });
  });

  it('один щит → базовый щит без стихии', () => {
    expect(parseSpell([m('shield', 'Щит', 0.9)])).toEqual({
      kind: 'shield', element: null, name: 'Щит', power: 90,
    });
  });

  it('щит + стихия → стихийный щит (в любом порядке)', () => {
    const r = parseSpell([m('shield', 'Щит', 0.8), m('water', 'Вода', 0.6)]);
    expect(r).toEqual({ kind: 'shield', element: 'water', name: 'Щит: Вода', power: 70 });
    const r2 = parseSpell([m('water', 'Вода', 0.6), m('shield', 'Щит', 0.8)]);
    expect(r2.kind).toBe('shield');
    if (r2.kind === 'shield') expect(r2.element).toBe('water');
  });

  it('две стихии-комбо → комбо со сродством', () => {
    const r = parseSpell([m('fire', 'Огонь', 0.8), m('air', 'Воздух', 0.6)]);
    expect(r).toEqual({ kind: 'combo', id: 'firestorm', name: 'Огненный вихрь', power: 105 });
  });

  it('две несочетающиеся стихии → осечка', () => {
    expect(parseSpell([m('fire', 'Огонь', 0.9), m('water', 'Вода', 0.9)]).kind).toBe('fizzle');
  });

  it('два щита → осечка', () => {
    expect(parseSpell([m('shield', 'Щит', 0.9), m('shield', 'Щит', 0.9)]).kind).toBe('fizzle');
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `npm test -- spell-types`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `src/spells/spell-types.ts`**

```ts
import { CONFIG } from '../config';
import { findCombo } from './combo';
import { affinity, ELEMENTS } from '../combat/elements';
import type { MatchResult } from '../recognition/recognizer';

export type Spell =
  | { kind: 'attack'; element: string; name: string; power: number }
  | { kind: 'combo'; id: string; name: string; power: number }
  | { kind: 'shield'; element: string | null; name: string; power: number }
  | { kind: 'fizzle'; reason: string };

const SHIELD_ID = 'shield';

function isElementId(id: string): boolean {
  return (ELEMENTS as readonly string[]).includes(id);
}

export function parseSpell(results: MatchResult[]): Spell {
  if (results.length === 0) return { kind: 'fizzle', reason: 'Ничего не нарисовано' };
  if (results.length > 2) return { kind: 'fizzle', reason: 'Пока не больше двух глифов' };
  if (results.some((r) => r.score < CONFIG.minScore)) {
    return { kind: 'fizzle', reason: 'Слишком неточно — рисуй чётче' };
  }

  if (results.length === 1) {
    const r = results[0];
    const power = Math.round(r.score * 100);
    if (r.glyph.id === SHIELD_ID) return { kind: 'shield', element: null, name: 'Щит', power };
    return { kind: 'attack', element: r.glyph.id, name: r.glyph.name, power };
  }

  const [a, b] = results;
  const aShield = a.glyph.id === SHIELD_ID;
  const bShield = b.glyph.id === SHIELD_ID;
  const power2 = Math.round(((a.score + b.score) / 2) * 100);

  if (aShield && bShield) return { kind: 'fizzle', reason: 'Два щита не сочетаются' };

  if (aShield || bShield) {
    const elem = aShield ? b : a;
    if (!isElementId(elem.glyph.id)) return { kind: 'fizzle', reason: 'Эти глифы не сочетаются' };
    return { kind: 'shield', element: elem.glyph.id, name: `Щит: ${elem.glyph.name}`, power: power2 };
  }

  const combo = findCombo(a.glyph.id, b.glyph.id);
  if (!combo) return { kind: 'fizzle', reason: 'Эти глифы не сочетаются' };
  const mult = affinity(combo.parts[0], combo.parts[1]);
  return { kind: 'combo', id: combo.id, name: combo.name, power: Math.round(power2 * mult) };
}
```

- [ ] **Step 4: Прогнать — убедиться, что проходит**

Run: `npm test -- spell-types`
Expected: PASS (9 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/spells/spell-types.ts tests/spell-types.test.ts
git commit -m "feat: типизованный парсер заклинаний (атака/комбо/щит)"
```

---

## Task 5: ИИ манекена `dummy-ai.ts`

**Files:**
- Create: `src/combat/dummy-ai.ts`
- Test: `tests/dummy-ai.test.ts`

Машина состояний: телеграф (показывает стихию) → выстрел (событие `fire`) → пауза → следующая стихия по кругу. Детерминированно, без `Math.random`.

- [ ] **Step 1: Написать падающий тест**

`tests/dummy-ai.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createDummyAi, tickDummyAi, telegraphElement } from '../src/combat/dummy-ai';
import { CONFIG } from '../src/config';

describe('dummy-ai', () => {
  it('старт — телеграф первой стихии', () => {
    const ai = createDummyAi();
    expect(telegraphElement(ai)).toBe('fire');
  });

  it('телеграф не стреляет, пока идёт', () => {
    const ai = createDummyAi();
    const t = tickDummyAi(ai, 100);
    expect(t.fire).toBeNull();
    expect(telegraphElement(t.ai)).toBe('fire');
  });

  it('конец телеграфа → выстрел текущей стихией, фаза паузы', () => {
    const ai = createDummyAi();
    const t = tickDummyAi(ai, CONFIG.combat.telegraphMs);
    expect(t.fire).toEqual({ element: 'fire' });
    expect(telegraphElement(t.ai)).toBeNull(); // пауза
  });

  it('конец паузы → телеграф следующей стихии, без выстрела', () => {
    let ai = createDummyAi();
    ai = tickDummyAi(ai, CONFIG.combat.telegraphMs).ai; // → пауза
    const t = tickDummyAi(ai, CONFIG.combat.dummyAttackIntervalMs); // → след. телеграф
    expect(t.fire).toBeNull();
    expect(telegraphElement(t.ai)).toBe('air');
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `npm test -- dummy-ai`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `src/combat/dummy-ai.ts`**

```ts
import { ELEMENTS } from './elements';
import { CONFIG } from '../config';

type Phase = 'telegraph' | 'cooldown';

export interface DummyAi {
  phase: Phase;
  timer: number; // остаток мс в текущей фазе
  elementIndex: number; // индекс стихии текущей/следующей атаки
}

export function createDummyAi(): DummyAi {
  return { phase: 'telegraph', timer: CONFIG.combat.telegraphMs, elementIndex: 0 };
}

export interface DummyTick {
  ai: DummyAi;
  fire: { element: string } | null;
}

/** Стихия, которая сейчас телеграфируется (null — пауза). */
export function telegraphElement(ai: DummyAi): string | null {
  return ai.phase === 'telegraph' ? ELEMENTS[ai.elementIndex] : null;
}

export function tickDummyAi(ai: DummyAi, dtMs: number): DummyTick {
  const timer = ai.timer - dtMs;
  if (timer > 0) return { ai: { ...ai, timer }, fire: null };

  if (ai.phase === 'telegraph') {
    const element = ELEMENTS[ai.elementIndex];
    return {
      ai: { phase: 'cooldown', timer: CONFIG.combat.dummyAttackIntervalMs, elementIndex: ai.elementIndex },
      fire: { element },
    };
  }

  const nextIndex = (ai.elementIndex + 1) % ELEMENTS.length;
  return {
    ai: { phase: 'telegraph', timer: CONFIG.combat.telegraphMs, elementIndex: nextIndex },
    fire: null,
  };
}
```

- [ ] **Step 4: Прогнать — убедиться, что проходит**

Run: `npm test -- dummy-ai`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add src/combat/dummy-ai.ts tests/dummy-ai.test.ts
git commit -m "feat: ИИ манекена — телеграф стихии и выстрел по таймеру"
```

---

## Task 6: Игрок с HP, стихийным щитом и уроном

**Files:**
- Modify: `src/combat/player.ts` (полностью заменить)
- Test: `tests/player.test.ts` (полностью заменить)

Сигнатуры `createPlayer`/`castShield` обратно совместимы (новые параметры со значениями по умолчанию), поэтому существующий `main.ts` продолжает компилироваться до задачи интеграции.

- [ ] **Step 1: Заменить `src/combat/player.ts`**

```ts
import { CONFIG } from '../config';
import { blockedDamage } from './combat';

export interface Player {
  hp: number;
  maxHp: number;
  alive: boolean;
  /** Остаток времени щита, мс (0 — щита нет). */
  shieldMs: number;
  /** Стихия активного щита (null — базовый щит или нет щита). */
  shieldElement: string | null;
}

export function createPlayer(maxHp: number = CONFIG.combat.playerHp): Player {
  return { hp: maxHp, maxHp, alive: true, shieldMs: 0, shieldElement: null };
}

export function castShield(p: Player, durationMs: number, element: string | null = null): Player {
  return { ...p, shieldMs: durationMs, shieldElement: element };
}

export function tickPlayer(p: Player, dtMs: number): Player {
  const shieldMs = Math.max(0, p.shieldMs - dtMs);
  return { ...p, shieldMs, shieldElement: shieldMs > 0 ? p.shieldElement : null };
}

export function isShielded(p: Player): boolean {
  return p.shieldMs > 0;
}

/** Применить входящую атаку: щит снижает урон (со сродством), HP падает. */
export function applyDamageToPlayer(p: Player, rawDamage: number, attackElement: string): Player {
  const dmg = isShielded(p)
    ? blockedDamage(p.shieldElement, rawDamage, attackElement)
    : Math.round(rawDamage);
  const hp = Math.max(0, p.hp - dmg);
  return { ...p, hp, alive: hp > 0 };
}

export function respawnPlayer(p: Player): Player {
  return { ...p, hp: p.maxHp, alive: true, shieldMs: 0, shieldElement: null };
}
```

- [ ] **Step 2: Заменить `tests/player.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  createPlayer,
  castShield,
  tickPlayer,
  isShielded,
  applyDamageToPlayer,
  respawnPlayer,
} from '../src/combat/player';

describe('player — HP и щит', () => {
  it('createPlayer — полный HP, без щита', () => {
    const p = createPlayer(100);
    expect(p.hp).toBe(100);
    expect(p.maxHp).toBe(100);
    expect(p.alive).toBe(true);
    expect(isShielded(p)).toBe(false);
  });

  it('castShield — ставит таймер и стихию щита', () => {
    const p = castShield(createPlayer(100), 10000, 'water');
    expect(p.shieldMs).toBe(10000);
    expect(p.shieldElement).toBe('water');
    expect(isShielded(p)).toBe(true);
  });

  it('tickPlayer — уменьшает таймер и снимает стихию при истечении', () => {
    const p = tickPlayer(castShield(createPlayer(100), 200, 'fire'), 500);
    expect(p.shieldMs).toBe(0);
    expect(p.shieldElement).toBeNull();
    expect(isShielded(p)).toBe(false);
  });

  it('applyDamageToPlayer — без щита полный урон', () => {
    const p = applyDamageToPlayer(createPlayer(100), 30, 'fire');
    expect(p.hp).toBe(70);
  });

  it('applyDamageToPlayer — щит снижает урон', () => {
    const shielded = castShield(createPlayer(100), 10000, null);
    const p = applyDamageToPlayer(shielded, 100, 'fire'); // базовый блок 0.6 → 40
    expect(p.hp).toBe(60);
  });

  it('applyDamageToPlayer — смерть при 0 HP', () => {
    const p = applyDamageToPlayer(createPlayer(20), 50, 'fire');
    expect(p.hp).toBe(0);
    expect(p.alive).toBe(false);
  });

  it('respawnPlayer — полный HP, щит снят', () => {
    const dead = applyDamageToPlayer(createPlayer(20), 50, 'fire');
    const p = respawnPlayer(dead);
    expect(p.hp).toBe(20);
    expect(p.alive).toBe(true);
    expect(p.shieldMs).toBe(0);
  });

  it('не мутирует вход', () => {
    const orig = createPlayer(100);
    applyDamageToPlayer(orig, 40, 'fire');
    expect(orig.hp).toBe(100);
  });
});
```

- [ ] **Step 3: Прогнать тесты и сборку**

Run: `npm test -- player`
Expected: PASS (8 тестов).
Run: `npm run build`
Expected: PASS — `main.ts` компилируется (createPlayer()/castShield(p, ms) валидны через дефолты).

- [ ] **Step 4: Commit**

```bash
git add src/combat/player.ts tests/player.test.ts
git commit -m "feat: игрок с HP, стихийным щитом, уроном и респавном"
```

---

## Task 7: Убрать комбо «лечащий барьер»

**Files:**
- Modify: `src/spells/combo.ts`
- Test: `tests/combo.test.ts`

Теперь «вода+щит» — стихийный щит (парсер), а не комбо.

- [ ] **Step 1: Удалить строку из `COMBOS` в `src/spells/combo.ts`**

Удалить:

```ts
  { id: 'healing-barrier', name: 'Лечащий барьер', parts: ['water', 'shield'] },
```

- [ ] **Step 2: Обновить тест в `tests/combo.test.ts`**

Заменить тест:

```ts
  it('таблица содержит лечащий барьер (вода+щит)', () => {
    const found = COMBOS.find((c) => c.id === 'healing-barrier');
    expect(found).toBeDefined();
    expect(found!.parts).toEqual(['water', 'shield']);
  });
```

на:

```ts
  it('лечащего барьера больше нет (вода+щит теперь стихийный щит)', () => {
    expect(COMBOS.find((c) => c.id === 'healing-barrier')).toBeUndefined();
    expect(findCombo('water', 'shield')).toBeNull();
  });
```

- [ ] **Step 3: Прогнать тесты и сборку**

Run: `npm test -- combo`
Expected: PASS (4 теста).
Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/spells/combo.ts tests/combo.test.ts
git commit -m "feat: убрать комбо «лечащий барьер» (вода+щит → стихийный щит)"
```

---

## Task 8: Сцена — HP-бар игрока, телеграф, попадание по игроку

**Files:**
- Modify: `src/combat/scene.ts`

Визуальный модуль (проверяется в браузере в задаче 9). Новые методы добавляются аддитивно; `main.ts` начнёт их вызывать в задаче 9.

- [ ] **Step 1: Добавить импорт цвета и поле телеграфа**

В начало `src/combat/scene.ts` после существующих импортов добавить:

```ts
import { colorFor } from '../effects/effects';
```

В классе `CombatScene` рядом с полями (`flash`, `shake`, ...) добавить:

```ts
  private telegraph: string | null = null;
```

- [ ] **Step 2: Добавить методы `setTelegraph` и `hitPlayer`**

В класс `CombatScene` (например, после метода `hit`) добавить:

```ts
  /** Установить стихию-телеграф над манекеном (null — нет). */
  setTelegraph(element: string | null): void {
    this.telegraph = element;
  }

  /** Анимация попадания по игроку (всплывающее число урона). */
  hitPlayer(amount: number): void {
    this.floaters.push({
      value: amount,
      x: this.playerPos.x,
      y: this.playerPos.y - 40,
      life: 1,
    });
  }
```

- [ ] **Step 3: Рисовать HP-бар игрока и телеграф в `draw`**

В методе `draw`, после `this.drawCaster(...)` и `this.drawDummy(...)`, добавить вызовы:

```ts
    this.drawHpBar(ctx, playerX, groundY - 120, player);
    if (this.telegraph) this.drawTelegraph(ctx, dummyX, groundY - 150);
```

(`drawHpBar` принимает структурно совместимый объект — у `Player` есть `hp`/`maxHp`.)

- [ ] **Step 4: Добавить приватный метод `drawTelegraph`**

В класс `CombatScene` добавить:

```ts
  private drawTelegraph(ctx: CanvasRenderingContext2D, cx: number, y: number): void {
    if (!this.telegraph) return;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = colorFor(this.telegraph);
    ctx.beginPath();
    ctx.arc(cx, y, 14, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#11131a';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', cx, y + 4);
    ctx.restore();
  }
```

- [ ] **Step 5: Проверить сборку**

Run: `npm run build`
Expected: PASS (новые методы пока не вызываются из `main.ts` — это нормально).

- [ ] **Step 6: Commit**

```bash
git add src/combat/scene.ts
git commit -m "feat: сцена — HP-бар игрока, иконка-телеграф, попадание по игроку"
```

---

## Task 9: Интеграция — парсер, двусторонний бой, удаление cast.ts

**Files:**
- Modify: `src/ui/hud.ts` (полностью заменить)
- Modify: `src/main.ts` (полностью заменить)
- Delete: `src/spells/cast.ts`, `tests/cast.test.ts`

Эта задача переключает игру на новый парсер и подключает двусторонний бой одним коммитом — сборка зелёная на коммите.

- [ ] **Step 1: Заменить `src/ui/hud.ts`**

```ts
import type { Spell } from '../spells/spell-types';

export class Hud {
  constructor(private el: HTMLElement) {
    this.el.innerHTML =
      'Рисуй глифы, затем ПРОБЕЛ — каст. △ огонь · ~ вода · ⌇ воздух · □ земля · ⚡ молния · ○ щит. G — подсказка';
  }

  showFizzle(reason: string): void {
    this.el.innerHTML = `Осечка: ${reason}`;
  }

  showAttack(spell: Spell, sizeFactor: number, damage: number, flightMs: number): void {
    if (spell.kind !== 'attack' && spell.kind !== 'combo') return;
    const label = spell.kind === 'combo' ? 'КОМБО' : 'Заклинание';
    this.el.innerHTML =
      `${label}: <b>${spell.name}</b> · размер ×${sizeFactor.toFixed(2)} · ` +
      `урон ${damage} · полёт ${(flightMs / 1000).toFixed(1)}с`;
  }

  showShield(element: string | null, durationMs: number): void {
    const suffix = element ? ` (${element})` : '';
    this.el.innerHTML = `<b>Щит${suffix}</b> поднят · ${Math.round(durationMs / 1000)} с`;
  }
}
```

- [ ] **Step 2: Заменить `src/main.ts`**

```ts
import { StrokeRecorder, type Stroke } from './drawing/stroke';
import { drawInk } from './drawing/canvas-renderer';
import { recognize, type MatchResult } from './recognition/recognizer';
import { GLYPHS } from './recognition/glyphs';
import { clusterStrokes } from './recognition/clustering';
import { parseSpell } from './spells/spell-types';
import { EffectSystem, colorFor } from './effects/effects';
import { Hud } from './ui/hud';
import { GuideOverlay } from './ui/guide';
import { CONFIG } from './config';
import { boundingBox } from './geometry';
import { createCombatant, applyDamage, respawn, sizeFactor, damageFor, flightTimeMs } from './combat/combat';
import {
  createPlayer,
  castShield,
  tickPlayer,
  applyDamageToPlayer,
  respawnPlayer,
} from './combat/player';
import { createDummyAi, tickDummyAi, telegraphElement } from './combat/dummy-ai';
import { CombatScene } from './combat/scene';
import { ProjectileSystem } from './combat/projectile';

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
const guide = new GuideOverlay();
const strokes: Stroke[] = [];

// --- combat ---
let dummy = createCombatant(CONFIG.combat.dummyHp);
let player = createPlayer(CONFIG.combat.playerHp);
let ai = createDummyAi();
const scene = new CombatScene();
const projectiles = new ProjectileSystem();
let dummyRespawnAt: number | null = null;
let playerRespawnAt: number | null = null;
// --- /combat ---

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
  if (e.code === 'KeyG') {
    guide.toggle();
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

  const spell = parseSpell(results);

  if (spell.kind === 'fizzle') {
    hud.showFizzle(spell.reason);
    strokes.length = 0;
    return;
  }

  if (spell.kind === 'shield') {
    player = castShield(player, CONFIG.combat.shieldMs, spell.element);
    hud.showShield(spell.element, CONFIG.combat.shieldMs);
    strokes.length = 0;
    return;
  }

  // атака или комбо → снаряд в манекен
  const all = strokes.flatMap((s) => s.points);
  const box = boundingBox(all);
  const spellSizePx = Math.max(box.maxX - box.minX, box.maxY - box.minY);
  const sf = sizeFactor(spellSizePx);
  const accuracy = spell.power / 100;
  const damage = damageFor(sf, accuracy);
  const flightMs = flightTimeMs(sf);
  const colorId = spell.kind === 'combo' ? spell.id : spell.element;
  projectiles.spawn({
    from: scene.origin,
    to: scene.target,
    flightMs,
    damage,
    colorId,
    target: 'dummy',
    element: spell.kind === 'attack' ? spell.element : '',
  });
  hud.showAttack(spell, sf, damage, flightMs);

  strokes.length = 0;
}

let last = performance.now();
function loop(now: number): void {
  const dt = now - last;
  last = now;

  // респавны
  if (dummyRespawnAt !== null && now >= dummyRespawnAt) {
    dummy = respawn(dummy);
    dummyRespawnAt = null;
  }
  if (playerRespawnAt !== null && now >= playerRespawnAt) {
    player = respawnPlayer(player);
    playerRespawnAt = null;
  }

  // тик щита
  player = tickPlayer(player, dt);

  // ИИ манекена: телеграф и выстрел по игроку
  const tick = tickDummyAi(ai, dt);
  ai = tick.ai;
  scene.setTelegraph(telegraphElement(ai));
  if (tick.fire && dummy.alive) {
    projectiles.spawn({
      from: scene.target,
      to: scene.origin,
      flightMs: CONFIG.combat.referenceFlightMs,
      damage: CONFIG.combat.dummyDamage,
      colorId: tick.fire.element,
      target: 'player',
      element: tick.fire.element,
    });
  }

  // прилёты снарядов
  for (const a of projectiles.update(dt)) {
    if (a.target === 'player') {
      if (player.alive) {
        const before = player.hp;
        player = applyDamageToPlayer(player, a.damage, a.element);
        const dealt = before - player.hp;
        scene.hitPlayer(dealt);
        effects.burst(a.x, a.y, colorFor(a.colorId), Math.min(100, dealt + 20));
        if (!player.alive) playerRespawnAt = now + CONFIG.combat.playerRespawnMs;
      }
    } else if (dummy.alive) {
      dummy = applyDamage(dummy, a.damage);
      scene.hit(a.damage);
      effects.burst(a.x, a.y, colorFor(a.colorId), Math.min(100, a.damage + 20));
      if (!dummy.alive) dummyRespawnAt = now + CONFIG.combat.respawnMs;
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  guide.draw(ctx, { w: canvas.width, h: canvas.height });
  scene.update(dt);
  scene.draw(ctx, dummy, player, { w: canvas.width, h: canvas.height });
  projectiles.draw(ctx);
  effects.update(dt);
  effects.draw(ctx);
  for (const s of strokes) drawInk(ctx, s.points);
  if (recorder.isDrawing) drawInk(ctx, recorder.current);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

- [ ] **Step 3: Удалить старый парсер**

```bash
git rm src/spells/cast.ts tests/cast.test.ts
```

- [ ] **Step 4: Проверить сборку и полный набор тестов**

Run: `npm run build`
Expected: PASS — ничего не импортирует удалённый `cast.ts`.
Run: `npm test`
Expected: все PASS (cast-тестов больше нет; есть spell-types).

- [ ] **Step 5: Ручная проверка в браузере**

Run: `npm run dev`, открыть `http://localhost:5173`.
Чек-лист:
- [ ] над манекеном периодически загорается цветная иконка-телеграф, затем летит снаряд в игрока;
- [ ] у игрока появился HP-бар, снаряды манекена снимают HP; смерть → респавн;
- [ ] нарисовать круг (щит) + пробел → базовый щит, входящий урон снижается;
- [ ] нарисовать круг + воду рядом → водяной щит; против атаки, которую вода бьёт, урон снижается сильнее, против бьющей воду — слабее;
- [ ] одиночная стихия → атака в манекен (как раньше); комбо работают;
- [ ] вода+щит больше не «лечащий барьер», а водяной щит.

- [ ] **Step 6: Commit**

```bash
git add src/ui/hud.ts src/main.ts
git commit -m "feat: двусторонний бой и типизованный парсер; удалить resolveCast"
```

---

## Task 10: Документация

**Files:**
- Modify: `docs/architecture.md`, `docs/spells.md`

- [ ] **Step 1: Обновить модули и поток в `docs/architecture.md`**

Заменить строку:

```markdown
- `spells/cast.ts` — `resolveCast(results)`: одиночное/комбо/осечка + сила.
```

на:

```markdown
- `spells/spell-types.ts` — `parseSpell(results)`: атака/комбо/щит/осечка.
```

После строки про `combat/elements.ts` добавить:

```markdown
- `combat/dummy-ai.ts` — `DummyAi`: телеграф стихии и выстрел манекена по таймеру.
```

В разделе «## Что тестируется» в перечень добавить `spell-types`, `dummy-ai` и убрать `cast`.

- [ ] **Step 2: Обновить `docs/spells.md`**

В таблице «## Комбо» удалить строку про «Лечащий барьер». После таблицы комбо добавить раздел:

```markdown
## Щиты и защита

- Круг (○) — **модификатор защиты**, а не стихия.
- `○` один → базовый щит (снижает урон на ~60%).
- `○` + стихия → стихийный щит: против стихии, которую он бьёт, держит лучше
  (до ~90%), против бьющей его — хуже (~40%). См. таблицу сродства.
- Манекен атакует в ответ и **телеграфит** стихию (иконка над ним) — успей
  поставить правильный стихийный щит.
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md docs/spells.md
git commit -m "docs: двусторонний бой, щиты и грамматика (фаза B)"
```

---

## Финальная проверка

- [ ] **Step 1: Полный прогон тестов**

Run: `npm test`
Expected: все PASS (combat +blockedDamage, projectile +поля, spell-types, dummy-ai, player обновлён, combo обновлён; cast удалён).

- [ ] **Step 2: Сборка**

Run: `npm run build`
Expected: PASS, `dist/` создаётся.

- [ ] **Step 3: Ручная проверка**

Пройти чек-лист из Task 9, Step 5.

- [ ] **Step 4: Чистота дерева**

Run: `git status`
Expected: рабочее дерево чистое.
