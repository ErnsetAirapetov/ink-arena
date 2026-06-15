# Боевая система — Фаза A: Сродство стихий Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить чистую модель сродства стихий (пентаграмма «камень-ножницы-бумага») и подключить её как множитель силы комбо — первая, фундаментальная фаза боевой системы.

**Architecture:** Новый чистый модуль `combat/elements.ts` (таблица сродства + функция `affinity`), множители в `config.ts`. Единственный видимый хук в этой фазе — бонус/штраф силы комбо в `spells/cast.ts` (атака-против-щита требует стихийных щитов и придёт в фазах B–C). Всё аддитивно, сборка остаётся зелёной.

**Tech Stack:** TypeScript, Vite, Vitest.

**Спека:** `docs/superpowers/specs/2026-06-15-combat-system-design.md` (раздел 3 «Элементы и сродство», фаза A).

**Соглашения:** Conventional Commits на русском; автор только владелец (`eriktarakan@gmail.com`), без упоминания ассистентов.

---

## Карта файлов

Создаётся:
- `src/combat/elements.ts` — `Element`, `ELEMENTS`, таблица `BEATS`, `affinity(att, def)`.
- `tests/elements.test.ts` — юнит-тесты сродства.

Меняется:
- `src/config.ts` — добавить множители `affinity: { strongMult, weakMult }`.
- `src/spells/cast.ts` — умножить силу комбо на `affinity(parts[0], parts[1])`.
- `tests/cast.test.ts` — обновить ожидаемую силу комбо с учётом множителя.
- `docs/architecture.md`, `docs/spells.md` — упомянуть модуль и сродство.

Не меняется: `combat/combat.ts`, `combat/player.ts`, `combat/projectile.ts`, `recognition/*`, `main.ts`.

---

## Task 1: Множители сродства в конфиге

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Добавить блок `affinity` в `CONFIG`**

В `src/config.ts` сразу после строки с `clusterGapPx` (перед блоком `combat:`) добавить:

```ts
  /** Множители сродства стихий (камень-ножницы-бумага). */
  affinity: {
    /** Атака сильной стихии по слабой. */
    strongMult: 1.5,
    /** Атака слабой стихии по сильной. */
    weakMult: 0.66,
  },
```

- [ ] **Step 2: Проверить сборку**

Run: `npm run build`
Expected: PASS без ошибок типов.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: множители сродства стихий в конфиге"
```

---

## Task 2: Модуль сродства `combat/elements.ts`

**Files:**
- Create: `src/combat/elements.ts`
- Test: `tests/elements.test.ts`

`affinity(attacker, defender)` возвращает множитель: `strongMult`, если атакующая стихия бьёт защищающуюся; `weakMult`, если наоборот; `1` при совпадении стихий или если любая из строк — не стихия (например, `shield`).

- [ ] **Step 1: Написать падающий тест**

`tests/elements.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { affinity, ELEMENTS } from '../src/combat/elements';

describe('affinity', () => {
  it('сильная стихия по слабой → множитель > 1', () => {
    expect(affinity('fire', 'air')).toBeGreaterThan(1);
  });

  it('слабая стихия по сильной → множитель < 1', () => {
    expect(affinity('air', 'fire')).toBeLessThan(1);
  });

  it('совпадение стихий → 1', () => {
    expect(affinity('fire', 'fire')).toBe(1);
  });

  it('неизвестная стихия (например, модификатор) → 1', () => {
    expect(affinity('fire', 'shield')).toBe(1);
    expect(affinity('shield', 'water')).toBe(1);
  });

  it('пентаграмма: каждая стихия бьёт ровно 2 и слаба против 2', () => {
    for (const el of ELEMENTS) {
      const others = ELEMENTS.filter((o) => o !== el);
      const strong = others.filter((o) => affinity(el, o) > 1).length;
      const weak = others.filter((o) => affinity(el, o) < 1).length;
      expect(strong, `${el} бьёт`).toBe(2);
      expect(weak, `${el} слаба`).toBe(2);
    }
  });

  it('направленность симметрична: если A бьёт B, то B слаб против A', () => {
    expect(affinity('water', 'fire')).toBeGreaterThan(1);
    expect(affinity('fire', 'water')).toBeLessThan(1);
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `npm test -- elements`
Expected: FAIL — модуль `../src/combat/elements` не найден.

- [ ] **Step 3: Реализовать `src/combat/elements.ts`**

```ts
import { CONFIG } from '../config';

export const ELEMENTS = ['fire', 'air', 'earth', 'lightning', 'water'] as const;
export type Element = (typeof ELEMENTS)[number];

/** Кого бьёт каждая стихия (×strongMult). Обратное направление — ×weakMult. */
const BEATS: Record<Element, [Element, Element]> = {
  fire: ['air', 'earth'],
  air: ['earth', 'lightning'],
  earth: ['lightning', 'water'],
  lightning: ['water', 'fire'],
  water: ['fire', 'air'],
};

function isElement(id: string): id is Element {
  return (ELEMENTS as readonly string[]).includes(id);
}

/**
 * Множитель сродства атакующей стихии против защищающейся.
 * Совпадение или неизвестная стихия (например, модификатор) → 1.0.
 */
export function affinity(attacker: string, defender: string): number {
  if (!isElement(attacker) || !isElement(defender)) return 1;
  if (attacker === defender) return 1;
  return BEATS[attacker].includes(defender)
    ? CONFIG.affinity.strongMult
    : CONFIG.affinity.weakMult;
}
```

- [ ] **Step 4: Прогнать — убедиться, что проходит**

Run: `npm test -- elements`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/combat/elements.ts tests/elements.test.ts
git commit -m "feat: модель сродства стихий (пентаграмма)"
```

---

## Task 3: Бонус сродства к силе комбо

**Files:**
- Modify: `src/spells/cast.ts`
- Test: `tests/cast.test.ts`

Сила комбо умножается на `affinity(combo.parts[0], combo.parts[1])`. Так сила комбо зависит от пары стихий: например, `firestorm` (огонь+воздух, огонь бьёт воздух) получает ×1.5, а `storm` (вода+молния, вода слаба против молнии) — ×0.66. Комбо со «щитом» (модификатор, не стихия) → ×1.0.

- [ ] **Step 1: Обновить тест комбо в `tests/cast.test.ts`**

Заменить тест:

```ts
  it('два сочетающихся глифа → комбо со средней силой', () => {
    const r = resolveCast([m('fire', 'Огонь', 0.8), m('air', 'Воздух', 0.6)]);
    expect(r).toEqual({ kind: 'combo', id: 'firestorm', name: 'Огненный вихрь', power: 70 });
  });
```

на (среднее 0.7 × 100 × affinity(fire,air)=1.5 = 105):

```ts
  it('два сочетающихся глифа → комбо с силой, умноженной на сродство', () => {
    const r = resolveCast([m('fire', 'Огонь', 0.8), m('air', 'Воздух', 0.6)]);
    expect(r).toEqual({ kind: 'combo', id: 'firestorm', name: 'Огненный вихрь', power: 105 });
  });
```

Остальные тесты `cast` не трогать.

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `npm test -- cast`
Expected: FAIL — текущая реализация даёт power 70, тест ждёт 105.

- [ ] **Step 3: Подключить сродство в `src/spells/cast.ts`**

Добавить импорт в начало файла (после существующих импортов):

```ts
import { affinity } from '../combat/elements';
```

В ветке комбо заменить:

```ts
  const [a, b] = results;
  const combo = findCombo(a.glyph.id, b.glyph.id);
  if (!combo) return { kind: 'fizzle', reason: 'Эти глифы не сочетаются' };
  const power = Math.round(((a.score + b.score) / 2) * 100);
  return { kind: 'combo', id: combo.id, name: combo.name, power };
```

на:

```ts
  const [a, b] = results;
  const combo = findCombo(a.glyph.id, b.glyph.id);
  if (!combo) return { kind: 'fizzle', reason: 'Эти глифы не сочетаются' };
  const mult = affinity(combo.parts[0], combo.parts[1]);
  const power = Math.round(((a.score + b.score) / 2) * 100 * mult);
  return { kind: 'combo', id: combo.id, name: combo.name, power };
```

- [ ] **Step 4: Прогнать — убедиться, что проходит**

Run: `npm test -- cast`
Expected: PASS (8 тестов).

- [ ] **Step 5: Прогнать весь набор и собрать**

Run: `npm test`
Expected: все PASS (включая `elements`).
Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/spells/cast.ts tests/cast.test.ts
git commit -m "feat: сила комбо учитывает сродство стихий"
```

---

## Task 4: Документация фазы A

**Files:**
- Modify: `docs/architecture.md`, `docs/spells.md`

- [ ] **Step 1: Добавить модуль в `docs/architecture.md`**

В списке «## Модули» после строки про `combat/scene.ts` (или рядом с прочими `combat/*`) добавить:

```markdown
- `combat/elements.ts` — сродство стихий (пентаграмма), `affinity(att, def)`.
```

- [ ] **Step 2: Добавить раздел про сродство в `docs/spells.md`**

В конец файла добавить:

```markdown
## Сродство стихий (камень-ножницы-бумага)

Каждая стихия сильна против двух и слаба против двух (×1.5 / ×0.66):

| Стихия | Бьёт | Слаба против |
|--------|------|--------------|
| 🔥 Огонь | воздух, земля | молния, вода |
| 🌪 Воздух | земля, молния | огонь, вода |
| ⛰ Земля | молния, вода | огонь, воздух |
| ⚡ Молния | вода, огонь | воздух, земля |
| 💧 Вода | огонь, воздух | молния, земля |

Сейчас сродство влияет на **силу комбо**: пара стихий в «сильной» связи усиливает
комбо, в «слабой» — ослабляет (множители в `src/config.ts`). Влияние на атаки
против щитов и стихийную защиту придёт в следующих фазах боевой системы.
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md docs/spells.md
git commit -m "docs: сродство стихий (фаза A)"
```

---

## Финальная проверка

- [ ] **Step 1: Полный прогон тестов**

Run: `npm test`
Expected: все PASS (включая `elements` — 6 тестов; `cast` — 8).

- [ ] **Step 2: Сборка**

Run: `npm run build`
Expected: PASS, `dist/` создаётся.

- [ ] **Step 3: Ручная проверка в браузере**

Run: `npm run dev`. Скастовать комбо «огненный вихрь» (огонь+воздух) и «шторм»
(вода+молния): в HUD сила вихря заметно выше (×1.5), шторма — ниже (×0.66).

- [ ] **Step 4: Чистота дерева**

Run: `git status`
Expected: рабочее дерево чистое.
