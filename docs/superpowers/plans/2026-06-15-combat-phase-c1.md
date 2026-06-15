# Боевая система — Фаза C1: статусы и щит-прочность Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ввести единую систему статусов на бойцах и превратить щит из таймера в пул прочности со стаком (с учётом сродства), слив `Player` в `Combatant`.

**Architecture:** Новый чистый модуль `combat/status.ts` (тип `Status`, операции над списком статусов). `Combatant` получает `statuses: Status[]`; урон проходит через статусы. `combat/player.ts` удаляется — игрок и манекен становятся обычными `Combatant`. Долевой блок щита (Фаза B) заменяется пулом поглощения. Эффекты (баф/дебаф) и новые глифы — отдельная под-фаза C2.

**Tech Stack:** TypeScript, Vite, Vitest.

**Спека:** `docs/superpowers/specs/2026-06-15-combat-phase-c-design.md` (под-фаза C1).

**Соглашения:** Conventional Commits на русском; автор только владелец (`eriktarakan@gmail.com`), без упоминания ассистентов.

---

## Карта файлов

Создаётся:
- `src/combat/status.ts` — `Status`, `EffectKind`, `ShieldStatus`, `addShield`, `tickStatuses`, `absorbIncoming`, `hasShield`, `shieldInfo`.
- `tests/status.test.ts`.

Меняется:
- `src/config.ts` — добавить `shieldAbsorb`, `maxShieldAbsorb`, `maxShieldMs`; (позже) убрать `shieldBlock`, `maxBlockFraction`.
- `src/combat/combat.ts` — `Combatant.statuses`; `applyAttack`; обновить `createCombatant`/`applyDamage`/`respawn`; (позже) убрать `blockedDamage`.
- `src/combat/scene.ts` — щит из статусов (пул + время).
- `src/main.ts` — игрок как `Combatant`; щит через `addShield`; тик статусов; урон через `applyAttack`.
- `tests/combat.test.ts` — учёт `statuses`; (позже) убрать тесты `blockedDamage`.
- `docs/architecture.md`.

Удаляется (в задаче 5):
- `src/combat/player.ts`, `tests/player.test.ts`.

> Тип `Status` определяется полным (со `shield`/`burn`/`vulnerable`/`empower`) уже в C1 — это модель данных из спеки. В C1 реализуется только логика щита; эффекты (создание burn/vulnerable/empower, DoT, усиление) подключаются в C2.

---

## Task 1: Поля щита-пула в конфиге

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Добавить поля в блок `combat` (после `shieldMs`)**

В `src/config.ts` внутри `combat`, после строки `shieldMs: 10000,` добавить:

```ts
    /** Прочность (пул поглощения) одного каста щита. */
    shieldAbsorb: 40,
    /** Кэп суммарной прочности щита при стаке. */
    maxShieldAbsorb: 120,
    /** Кэп длительности щита при стаке, мс. */
    maxShieldMs: 30000,
```

(Поля `shieldBlock`/`maxBlockFraction` пока остаются — их удалит задача 5.)

- [ ] **Step 2: Проверить сборку**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: поля щита-пула (прочность, кэпы стака)"
```

---

## Task 2: Модуль статусов `combat/status.ts`

**Files:**
- Create: `src/combat/status.ts`
- Test: `tests/status.test.ts`

- [ ] **Step 1: Написать падающий тест**

`tests/status.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  addShield,
  tickStatuses,
  absorbIncoming,
  shieldInfo,
  hasShield,
  type Status,
} from '../src/combat/status';

describe('status — щит', () => {
  it('addShield — новый щит', () => {
    const s = addShield([], 'water', 40, 10000);
    const sh = shieldInfo(s)!;
    expect(sh.element).toBe('water');
    expect(sh.absorb).toBe(40);
    expect(sh.durationMs).toBe(10000);
  });

  it('addShield — стак суммирует прочность и время, стихия последняя', () => {
    let s = addShield([], 'water', 40, 10000);
    s = addShield(s, 'fire', 40, 10000);
    const sh = shieldInfo(s)!;
    expect(sh.absorb).toBe(80);
    expect(sh.durationMs).toBe(20000);
    expect(sh.element).toBe('fire');
    expect(hasShield(s)).toBe(true);
  });

  it('addShield — стак не превышает кэпы', () => {
    let s: Status[] = [];
    for (let i = 0; i < 5; i++) s = addShield(s, null, 40, 10000);
    const sh = shieldInfo(s)!;
    expect(sh.absorb).toBe(120); // maxShieldAbsorb
    expect(sh.durationMs).toBe(30000); // maxShieldMs
  });

  it('tickStatuses — истёкший щит спадает', () => {
    const s = tickStatuses(addShield([], null, 40, 200), 500);
    expect(hasShield(s)).toBe(false);
  });

  it('tickStatuses — уменьшает время', () => {
    const s = tickStatuses(addShield([], null, 40, 1000), 300);
    expect(shieldInfo(s)!.durationMs).toBe(700);
  });

  it('absorbIncoming — без щита полный урон', () => {
    const r = absorbIncoming([], 30, 'fire');
    expect(r.hpDamage).toBe(30);
  });

  it('absorbIncoming — базовый щит гасит из пула, перелив по HP, щит спадает при опустошении', () => {
    const r = absorbIncoming(addShield([], null, 40, 10000), 100, 'fire');
    expect(r.hpDamage).toBe(60); // 100 - 40
    expect(hasShield(r.statuses)).toBe(false); // пул опустел
  });

  it('absorbIncoming — стихийный щит силён против атаки тратит пул меньше', () => {
    // щит fire против air (fire бьёт air, ×1.5): входящее 30/1.5=20, пул 100→80
    const r = absorbIncoming(addShield([], 'fire', 100, 10000), 30, 'air');
    expect(r.hpDamage).toBe(0);
    expect(shieldInfo(r.statuses)!.absorb).toBe(80);
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `npm test -- status`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `src/combat/status.ts`**

```ts
import { CONFIG } from '../config';
import { affinity } from './elements';

export type EffectKind = 'burn' | 'vulnerable' | 'empower';

export type Status =
  | { kind: 'shield'; element: string | null; absorb: number; durationMs: number }
  | { kind: 'burn'; durationMs: number; dps: number }
  | { kind: 'vulnerable'; durationMs: number; extra: number }
  | { kind: 'empower'; durationMs: number; bonus: number };

export type ShieldStatus = Extract<Status, { kind: 'shield' }>;

export function shieldInfo(statuses: Status[]): ShieldStatus | null {
  return statuses.find((s): s is ShieldStatus => s.kind === 'shield') ?? null;
}

export function hasShield(statuses: Status[]): boolean {
  return shieldInfo(statuses) !== null;
}

/** Добавить/стакнуть щит: прочность и время суммируются (с кэпами), стихия — последняя. */
export function addShield(
  statuses: Status[],
  element: string | null,
  absorb: number,
  durationMs: number,
): Status[] {
  const existing = shieldInfo(statuses);
  const others = statuses.filter((s) => s.kind !== 'shield');
  const base = existing ?? { absorb: 0, durationMs: 0 };
  return [
    ...others,
    {
      kind: 'shield',
      element,
      absorb: Math.min(CONFIG.combat.maxShieldAbsorb, base.absorb + absorb),
      durationMs: Math.min(CONFIG.combat.maxShieldMs, base.durationMs + durationMs),
    },
  ];
}

/** Уменьшить длительности, снять истёкшие/опустошённые статусы. */
export function tickStatuses(statuses: Status[], dtMs: number): Status[] {
  return statuses
    .map((s) => ({ ...s, durationMs: s.durationMs - dtMs }))
    .filter((s) => s.durationMs > 0 && (s.kind !== 'shield' || s.absorb > 0));
}

/** Применить входящий урон через статусы: щит со сродством гасит из пула. */
export function absorbIncoming(
  statuses: Status[],
  raw: number,
  attackElement: string,
): { statuses: Status[]; hpDamage: number } {
  const shield = shieldInfo(statuses);
  if (!shield) return { statuses, hpDamage: Math.round(raw) };

  const adjusted = Math.round(raw / affinity(shield.element ?? '', attackElement));
  const absorbed = Math.min(shield.absorb, adjusted);
  const remaining = shield.absorb - absorbed;
  const hpDamage = adjusted - absorbed;

  const others = statuses.filter((s) => s.kind !== 'shield');
  const next = remaining > 0 ? [...others, { ...shield, absorb: remaining }] : others;
  return { statuses: next, hpDamage };
}
```

- [ ] **Step 4: Прогнать — убедиться, что проходит**

Run: `npm test -- status`
Expected: PASS (8 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/combat/status.ts tests/status.test.ts
git commit -m "feat: система статусов и щит-прочность со стаком и сродством"
```

---

## Task 3: `Combatant` со статусами и `applyAttack`

**Files:**
- Modify: `src/combat/combat.ts`
- Test: `tests/combat.test.ts`

- [ ] **Step 1: Обновить тесты в `tests/combat.test.ts`**

Заменить тест `createCombatant`:

```ts
  it('createCombatant — полный HP и жив', () => {
    expect(createCombatant(100)).toEqual({ hp: 100, maxHp: 100, alive: true });
  });
```

на:

```ts
  it('createCombatant — полный HP, жив, без статусов', () => {
    expect(createCombatant(100)).toEqual({ hp: 100, maxHp: 100, alive: true, statuses: [] });
  });
```

Заменить тест `respawn`:

```ts
  it('respawn — восстанавливает полный HP', () => {
    const dead = applyDamage(createCombatant(100), 200);
    expect(respawn(dead)).toEqual({ hp: 100, maxHp: 100, alive: true });
  });
```

на:

```ts
  it('respawn — полный HP и очищенные статусы', () => {
    const dead = applyDamage(createCombatant(100), 200);
    expect(respawn(dead)).toEqual({ hp: 100, maxHp: 100, alive: true, statuses: [] });
  });
```

Дописать в конец файла тесты `applyAttack`:

```ts
import { applyAttack } from '../src/combat/combat';
import { addShield } from '../src/combat/status';

describe('combat — applyAttack через статусы', () => {
  it('без щита — полный урон', () => {
    const c = applyAttack(createCombatant(100), 30, 'fire');
    expect(c.hp).toBe(70);
  });

  it('со щитом — урон гасится пулом', () => {
    let c = createCombatant(100);
    c = { ...c, statuses: addShield(c.statuses, null, 40, 10000) };
    const hit = applyAttack(c, 100, 'fire'); // пул 40 → по HP 60
    expect(hit.hp).toBe(40);
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `npm test -- combat`
Expected: FAIL — нет `statuses`/`applyAttack`.

- [ ] **Step 3: Обновить `src/combat/combat.ts`**

Добавить импорт после существующих:

```ts
import { absorbIncoming, type Status } from './status';
```

Заменить интерфейс и три функции:

```ts
export interface Combatant {
  hp: number;
  maxHp: number;
  alive: boolean;
  statuses: Status[];
}

/** Создать бойца с полным HP. */
export function createCombatant(maxHp: number): Combatant {
  return { hp: maxHp, maxHp, alive: true, statuses: [] };
}

/** Применить плоский урон (без статусов). Возвращает нового бойца. */
export function applyDamage(c: Combatant, amount: number): Combatant {
  const hp = Math.max(0, Math.min(c.maxHp, c.hp - amount));
  return { ...c, hp, alive: hp > 0 };
}

/** Воскресить с полным HP и очищенными статусами. */
export function respawn(c: Combatant): Combatant {
  return { ...c, hp: c.maxHp, alive: true, statuses: [] };
}
```

Дописать в конец файла:

```ts
/** Применить входящую атаку через статусы (щит со сродством). */
export function applyAttack(c: Combatant, raw: number, attackElement: string): Combatant {
  const { statuses, hpDamage } = absorbIncoming(c.statuses, raw, attackElement);
  const hp = Math.max(0, c.hp - hpDamage);
  return { ...c, hp, statuses, alive: hp > 0 };
}
```

- [ ] **Step 4: Прогнать — убедиться, что проходит**

Run: `npm test -- combat`
Expected: PASS (обновлённые + 2 новых).
Run: `npm run build`
Expected: PASS (`main.ts` создаёт `createCombatant` — лишнее поле `statuses` не мешает; `blockedDamage`/`player.ts` пока на месте).

- [ ] **Step 5: Commit**

```bash
git add src/combat/combat.ts tests/combat.test.ts
git commit -m "feat: Combatant со статусами и урон через applyAttack"
```

---

## Task 4: Перевести игрока на Combatant+статусы (main, scene)

**Files:**
- Modify: `src/main.ts`
- Modify: `src/combat/scene.ts`

После этой задачи `main.ts`/`scene.ts` не используют `combat/player.ts` (он остаётся, но не импортируется — сборка зелёная).

- [ ] **Step 1: Сцена — щит из статусов**

В `src/combat/scene.ts` заменить импорт:

```ts
import { type Player, isShielded } from './player';
```

на:

```ts
import { shieldInfo } from './status';
```

В сигнатурах `draw` и `drawCaster` заменить тип `player: Player` на `player: Combatant`.

В `drawCaster` заменить блок ауры щита:

```ts
    // аура щита позади фигуры
    if (isShielded(player)) {
      const sec = Math.ceil(player.shieldMs / 1000);
```

на:

```ts
    // аура щита позади фигуры
    const sh = shieldInfo(player.statuses);
    if (sh) {
      const sec = Math.ceil(sh.durationMs / 1000);
```

И в том же блоке заменить подпись:

```ts
      ctx.fillText(`щит ${sec}с`, x, groundY - 116);
```

на:

```ts
      ctx.fillText(`щит ${sh.absorb} · ${sec}с`, x, groundY - 116);
```

- [ ] **Step 2: main — игрок как Combatant**

В `src/main.ts` заменить импорты игрока:

```ts
import {
  createPlayer,
  castShield,
  tickPlayer,
  applyDamageToPlayer,
  respawnPlayer,
} from './combat/player';
```

на расширение импорта из combat и добавление статусов:

```ts
import { createCombatant, applyDamage, respawn, applyAttack, sizeFactor, damageFor, flightTimeMs } from './combat/combat';
import { addShield, tickStatuses } from './combat/status';
```

И удалить старую строку импорта `createCombatant, applyDamage, respawn, sizeFactor, damageFor, flightTimeMs` (она объединена выше).

Заменить создание игрока:

```ts
let player = createPlayer(CONFIG.combat.playerHp);
```

на:

```ts
let player = createCombatant(CONFIG.combat.playerHp);
```

В `cast()` заменить ветку щита:

```ts
  if (spell.kind === 'shield') {
    player = castShield(player, CONFIG.combat.shieldMs, spell.element);
    hud.showShield(spell.element, CONFIG.combat.shieldMs);
    strokes.length = 0;
    return;
  }
```

на:

```ts
  if (spell.kind === 'shield') {
    player = {
      ...player,
      statuses: addShield(player.statuses, spell.element, CONFIG.combat.shieldAbsorb, CONFIG.combat.shieldMs),
    };
    hud.showShield(spell.element, CONFIG.combat.shieldMs);
    strokes.length = 0;
    return;
  }
```

В `loop()` заменить тик щита:

```ts
  // тик щита
  player = tickPlayer(player, dt);
```

на тик статусов обоих бойцов:

```ts
  // тик статусов
  player = { ...player, statuses: tickStatuses(player.statuses, dt) };
  dummy = { ...dummy, statuses: tickStatuses(dummy.statuses, dt) };
```

Заменить ветку респавна игрока:

```ts
  if (playerRespawnAt !== null && now >= playerRespawnAt) {
    player = respawnPlayer(player);
    playerRespawnAt = null;
  }
```

на:

```ts
  if (playerRespawnAt !== null && now >= playerRespawnAt) {
    player = respawn(player);
    playerRespawnAt = null;
  }
```

Заменить применение урона по игроку:

```ts
        const before = player.hp;
        player = applyDamageToPlayer(player, a.damage, a.element);
        const dealt = before - player.hp;
```

на:

```ts
        const before = player.hp;
        player = applyAttack(player, a.damage, a.element);
        const dealt = before - player.hp;
```

- [ ] **Step 3: Проверить сборку и тесты**

Run: `npm run build`
Expected: PASS (`main.ts`/`scene.ts` больше не зависят от `player.ts`).
Run: `npm test`
Expected: все PASS.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/combat/scene.ts
git commit -m "feat: игрок как Combatant со статусами; щит из пула прочности"
```

---

## Task 5: Удалить player.ts, blockedDamage и старые поля конфига

**Files:**
- Delete: `src/combat/player.ts`, `tests/player.test.ts`
- Modify: `src/combat/combat.ts`, `tests/combat.test.ts`, `src/config.ts`

- [ ] **Step 1: Удалить модуль игрока и его тест**

```bash
git rm src/combat/player.ts tests/player.test.ts
```

- [ ] **Step 2: Убрать `blockedDamage` из `src/combat/combat.ts`**

Удалить функцию целиком:

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

После удаления `blockedDamage` функция `affinity` в `combat.ts` больше не используется напрямую — удалить импорт `import { affinity } from './elements';`, если он стал неиспользуемым (иначе `noUnusedLocals` уронит сборку).

- [ ] **Step 3: Убрать тесты `blockedDamage` из `tests/combat.test.ts`**

Удалить весь блок:

```ts
import { blockedDamage } from '../src/combat/combat';

describe('blockedDamage — поглощение щитом', () => {
  ...
});
```

- [ ] **Step 4: Убрать старые поля щита из `src/config.ts`**

Удалить строки:

```ts
    /** Базовая доля поглощения урона щитом (0..1). */
    shieldBlock: 0.6,
    /** Верхняя граница доли поглощения. */
    maxBlockFraction: 0.95,
```

- [ ] **Step 5: Прогнать тесты и сборку**

Run: `npm test`
Expected: все PASS (нет `player`/`blockedDamage` тестов).
Run: `npm run build`
Expected: PASS — ничто не ссылается на удалённое.

- [ ] **Step 6: Commit**

```bash
git add src/combat/combat.ts tests/combat.test.ts src/config.ts
git commit -m "refactor: удалить player.ts, blockedDamage и долевой блок (щит — пул)"
```

---

## Task 6: Документация

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Обновить модули и поток в `docs/architecture.md`**

Заменить строку про `combat/player.ts`:

```markdown
- `combat/player.ts` — игрок: HP, стихийный щит, урон, респавн (`createPlayer`, `castShield`, `applyDamageToPlayer`, `respawnPlayer`).
```

на:

```markdown
- `combat/status.ts` — статусы бойца: щит-пул со стаком и сродством (`addShield`, `tickStatuses`, `absorbIncoming`, `shieldInfo`).
```

В строке `combat/combat.ts` заменить перечень на актуальный:

```markdown
- `combat/combat.ts` — `Combatant` (HP + `statuses`), урон (`applyDamage`, `applyAttack`), `sizeFactor`, `damageFor`, `speedFactor`, `flightTimeMs`, `respawn`.
```

В разделе «## Что тестируется» добавить `status` и убрать `player`.

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: система статусов и щит-прочность (фаза C1)"
```

---

## Финальная проверка

- [ ] **Step 1: Полный прогон тестов**

Run: `npm test`
Expected: все PASS (status новый; combat обновлён; player удалён).

- [ ] **Step 2: Сборка**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Ручная проверка в браузере**

Run: `npm run dev`. Поднять щит (○), посмотреть, что у ауры показывается пул и
время; атаки манекена тратят пул, при опустошении щит спадает; повторный каст
щита наращивает пул/время (стак).

- [ ] **Step 4: Чистота дерева**

Run: `git status`
Expected: рабочее дерево чистое.
