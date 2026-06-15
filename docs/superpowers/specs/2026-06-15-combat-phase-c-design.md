# Боевая система — Фаза C: статусы (прочность щита + бафы/дебафы) (дизайн)

**Дата:** 2026-06-15
**Статус:** утверждён, готов к планированию (реализация по под-фазам C1, C2)
**Связано:** `2026-06-15-combat-system-design.md` (фаза C), развивает фазы A и B

## 1. Цель

Ввести **единую систему статусов** на бойцах: щит получает прочность и стак,
появляются стихийные бафы/дебафы с длительностью. Это превращает щит из таймера в
полноценную защиту и даёт первые тактические эффекты.

## 2. Общая система статусов

Вместо отдельного таймера щита у бойца — список статусов. Это объединяет щит, бафы
и дебафы и готовит почву к PvP.

```ts
type Status =
  | { kind: 'shield'; element: string | null; absorb: number; durationMs: number }
  | { kind: 'burn'; durationMs: number; dps: number }         // 🔥 дебаф: урон/сек
  | { kind: 'vulnerable'; durationMs: number; extra: number } // ⛰ дебаф: +extra доля входящего
  | { kind: 'empower'; durationMs: number; bonus: number };    // ⚡ баф: +bonus доля исходящего
```

**`Player` сливается в `Combatant`.** И игрок, и манекен — `Combatant { hp, maxHp,
alive, statuses: Status[] }`. Модуль `combat/player.ts` удаляется; его роль берёт
`combat/status.ts` + расширенный `combat/combat.ts`.

## 3. Щит: прочность + стак

Заменяет долевой блок Фазы B (он был временным).

- Щит — **пул поглощения** `absorb` + длительность `durationMs`.
- Входящий урон по бойцу со щитом:
  1. усиление дебафом `vulnerable`: `dmg = raw × (1 + extra)`;
  2. сродство щита: `dmg = round(dmg / affinity(shieldElement, attackElement))`
     (стихийный щит силён против атаки → меньше тратит пул; базовый щит → `affinity = 1`);
  3. пул гасит: `absorbed = min(pool, dmg)`, пул `-= absorbed`, по HP идёт
     `dmg − absorbed`;
  4. щит спадает, если пул `≤ 0` или истекла длительность.
- **Стак:** повторный каст щита суммирует `absorb` (кэп `maxShieldAbsorb`) и
  продлевает `durationMs` (кэп `maxShieldMs`); стихия — у последнего каста.

Старые поля `shieldBlock`, `maxBlockFraction` из `config` удаляются; функция
`blockedDamage` заменяется логикой в `status.ts`.

## 4. Стартовые стихийные эффекты

Эффект определяется парой модификатор+стихия. В фазе C реализуем три:

- `дебаф + fire` → **Горение** (`burn`): DoT, `dps` урона/сек на `durationMs`.
- `дебаф + earth` → **Уязвимость** (`vulnerable`): цель получает `+extra` доля
  входящего урона на `durationMs`.
- `буф + lightning` → **Усиление** (`empower`): исходящие атаки кастера `+bonus`
  доля урона на `durationMs`.

Прочие связки модификатор+стихия → осечка «Эффект ещё не изучен». Числа
(`dps`, `extra`, `bonus`, длительности) — в `config`.

Повторное наложение того же эффекта **обновляет длительность** (не стакается по
величине — это вне области, раздел 8).

## 5. Новые глифы и грамматика

Два новых модификатор-глифа, одной линией, различимы:
- **`buff` = `/`** (восходящая черта);
- **`debuff` = `\`** (нисходящая черта).

(Формы выбраны простыми и ортогональными к 6 существующим; при путанице легко
заменить — как прежние глифы.)

`spells/spell-types.ts` расширяется. Модификаторы теперь: `shield`, `buff`,
`debuff`. Типы заклинаний:

```ts
type Spell =
  | { kind: 'attack'; element: string; name: string; power: number; effect?: EffectKind }
  | { kind: 'combo'; id: string; name: string; power: number }
  | { kind: 'shield'; element: string | null; name: string; power: number }
  | { kind: 'buff'; element: string; effect: EffectKind; name: string; power: number }
  | { kind: 'fizzle'; reason: string };

type EffectKind = 'burn' | 'vulnerable' | 'empower';
```

Разбор (дополнение к фазе B):

| Нарисовано | Spell |
|------------|-------|
| `buff` + стихия (эффект определён) | `buff(element, effect)` — аура на себя |
| `debuff` + стихия (эффект определён) | `attack(element, effect)` — атака с дебафом |
| `buff`/`debuff` в одиночку | осечка («модификатору нужна стихия») |
| модификатор + стихия без эффекта | осечка («эффект ещё не изучен») |
| два модификатора | осечка |

Маршрутизация: `buff` применяет статус к игроку сразу; `attack` с `effect` несёт
эффект в снаряде и накладывает его на цель по прилёте; `shield`/`combo`/`attack`
без эффекта — как в фазе B.

## 6. Модули

Создаётся:
- `combat/status.ts` — `Status`, `EffectKind`, чистые функции:
  - `addShield(statuses, element, absorb, durationMs)` — добавить/стакнуть щит (с кэпами);
  - `addEffect(statuses, status)` — добавить баф/дебаф (обновить длительность, если есть);
  - `tickStatuses(statuses, dtMs) → { statuses, dotDamage }` — длительности и DoT;
  - `absorbIncoming(statuses, raw, attackElement) → { statuses, hpDamage }` —
    уязвимость + щит со сродством;
  - `outgoingMultiplier(statuses) → number` — множитель урона от `empower`;
  - `hasShield(statuses)`, `shieldInfo(statuses)` — для отрисовки.

Меняется:
- `combat/combat.ts` — `Combatant` получает `statuses: Status[]`; `createCombatant`
  инициализирует `[]`; урон по бойцу учитывает статусы (через `absorbIncoming`).
- `spells/spell-types.ts` — новые модификаторы и эффекты.
- `recognition/glyphs.ts` — глифы `buff` (`/`), `debuff` (`\`).
- `combat/projectile.ts` — снаряд несёт опц. `effect?: EffectKind`.
- `combat/scene.ts` — индикаторы активных статусов (щит-пул, иконки бафов/дебафов).
- `ui/hud.ts` — сообщения для бафа/дебафа.
- `ui/guide.ts` — гост-карточки новых глифов и легенда эффектов.
- `main.ts` — статусы у игрока/манекена, тик статусов и DoT, усиление урона,
  наложение дебафа по прилёте.
- `config.ts` — поля эффектов и щита-пула; убрать `shieldBlock`/`maxBlockFraction`.

Удаляется:
- `combat/player.ts`, `tests/player.test.ts` (логика уходит в `combat`/`status`).

## 7. Реализация по под-фазам

Чтобы не утонуть, фаза C делится на две под-фазы (каждая — свой план, бой
остаётся рабочим):

- **C1 — Статусы + щит-прочность.** `combat/status.ts`; `Combatant.statuses`; щит
  как пул со стаком и сродством; слияние `player.ts` в `Combatant`. Без новых
  глифов и эффектов. Грамматика щита та же (базовый/стихийный).
- **C2 — Эффекты + глифы.** Глифы `buff`/`debuff`; 3 стихийных эффекта (burn,
  vulnerable, empower); снаряд несёт эффект; индикаторы статусов и легенда.

## 8. Тестирование

- `status`: стак щита (рост absorb/времени, кэпы); `absorbIncoming` (уязвимость,
  сродство, перелив по HP, спад щита); `tickStatuses` (длительности, DoT-урон);
  `outgoingMultiplier` (усиление, произведение).
- `spell-types`: новые ветки (баф+стихия, дебаф+стихия, одиночный модификатор,
  неизученный эффект).
- `combat`: `Combatant` с `statuses`, урон через статусы.
- `recognizer`: новые глифы узнаются как сами себя.
- Визуальное (индикаторы статусов, DoT, легенда) — вручную в браузере.

## 9. Вне области (roadmap)

- Полный каталог стихийных эффектов (все 5 стихий × баф/дебаф).
- Стак эффектов по величине (а не только обновление длительности).
- Дебафы от атак манекена.
- Свет/тьма; касты из 3+ глифов.
