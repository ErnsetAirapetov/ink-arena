# Дизайн: бой v2 — снаряды, размер→сила/скорость, щит-статус

Дата: 2026-06-15

## Цель
Прокачать боевую механику: заклинания вылетают из персонажа снарядом с
авто-наводкой в манекен, летят по случайной (не кратчайшей) траектории за
детерминированное время, урон наносится на попадании. Сила и скорость
заклинания определяются его размером (баланс «сильное-медленное» против
«слабое-быстрое»). Щит — самобаф-статус, защищающий игрока.

## Решения (подтверждены)
- **Урон** = `baseDamage × sizeFactor × accuracy` (и размер, и точность).
- **Щит** — статус + аура + таймер 10 с; игрок без HP, блок урона как задел
  на будущее (сейчас по игроку никто не бьёт).
- **Несколько снарядов** в полёте одновременно.
- **Все комбо** — обычные снаряды по манекену (включая «Лечащий барьер» пока).

## Модель силы и скорости

Распознаватель масштаб-инвариантен, поэтому размер меряется отдельно — по
bounding box всех нарисованных точек каста.

- `spellSizePx` = макс. сторона bounding box всех точек каста.
- `sizeFactor = clamp(spellSizePx / referenceSizePx, minSizeFactor, maxSizeFactor)`.
  Эталон (sizeFactor = 1.0) = 100% силы.
- `accuracy` = точность каста, `outcome.power / 100` (0..1).
- **Урон**: `round(baseDamage × sizeFactor × accuracy)`.
- **Скорость**: `speedFactor = clamp(2 − sizeFactor, minSpeedFactor, +∞)`.
  +50% силы (sizeFactor 1.5) → −50% скорости (speedFactor 0.5).
- **Время полёта**: `referenceFlightMs / speedFactor`.
  Эталон → 1000 мс; ×1.5 → 2000 мс; ×0.7 → ~770 мс.

## Снаряды

- Рождается у игрока (`scene.origin`), цель — манекен (`scene.target`),
  авто-наводка на позицию манекена в момент спавна.
- Траектория — квадратичная кривая Безье `from → control → to`, где `control` —
  середина отрезка плюс случайное перпендикулярное смещение (рандомная форма,
  не кратчайшая).
- Позиция параметризуется `t = elapsed / flightMs` ∈ [0, 1]. При `t = 1` снаряд
  ровно в цели → время прилёта постоянно для данного заклинания независимо от
  длины кривой.
- Урон применяется в момент попадания (`t ≥ 1`), не при касте.
- Несколько снарядов одновременно — массив активных в `ProjectileSystem`.

## Щит

- Глиф «shield» (одиночный каст) → снаряд не летит; `castShield(player)`
  ставит статус на `shieldMs`.
- `scene` рисует ауру вокруг игрока, пока `isShielded`, и таймер обратного
  отсчёта.
- Комбо «Лечащий барьер» (water+shield) пока ведёт себя как обычный снаряд.

## Архитектура

### `combat/combat.ts` — чистый модуль (TDD), расширение
```ts
sizeFactor(spellSizePx: number): number   // clamp(px/ref, min, max)
damageFor(sizeFactor: number, accuracy: number): number  // round(base*sf*acc)
speedFactor(sizeFactor: number): number   // clamp(2 - sf, minSpeed, +inf)
flightTimeMs(sizeFactor: number): number  // referenceFlightMs / speedFactor
// без изменений: Combatant, createCombatant, applyDamage, respawn
```

### `combat/projectile.ts` — новый, чистая математика + класс (TDD)
```ts
quadraticPoint(a: Pt, c: Pt, b: Pt, t: number): Pt   // Безье, t=0→a, t=1→b
arcControl(from: Pt, to: Pt, offset: number): Pt     // середина + перпендикуляр*offset

interface Arrival { x: number; y: number; damage: number; colorId: string }

class ProjectileSystem {
  spawn(opts: { from: Pt; to: Pt; flightMs: number; damage: number; colorId: string }): void
  update(dtMs: number): Arrival[]   // продвинуть; вернуть долетевшие (и удалить их)
  draw(ctx: CanvasRenderingContext2D): void
}
```
`spawn` сам считает случайный `arcControl` (Math.random — в браузере допустимо).
Время прилёта детерминировано (рандом влияет только на форму), поэтому
`update` тестируется без рандома.

### `combat/player.ts` — новый, чистый модуль (TDD)
```ts
interface Player { shieldMs: number }
createPlayer(): Player                       // { shieldMs: 0 }
castShield(p: Player, durationMs: number): Player
tickPlayer(p: Player, dtMs: number): Player  // shieldMs уменьшается до 0
isShielded(p: Player): boolean               // shieldMs > 0
```

### `combat/scene.ts` — визуальный, расширение
- Геттер `origin` — позиция игрока (для спавна снарядов).
- Рисует игрока с аурой щита (когда передан активный статус) и таймером отсчёта.
- Существующее: манекен, HP-бар, вспышка/тряска, всплывающие цифры урона.
- `draw(ctx, dummy, player, size)` — добавлен параметр `player`.

### `main.ts` — визуальный, новая проводка
- Считать `spellSizePx` из bbox всех точек каста.
- Щит (одиночный) → `castShield`. Иначе → `projectiles.spawn(...)`.
- В цикле: `tickPlayer`, `projectiles.update(dt)` → на каждый прилёт
  `applyDamage` + `scene.hit` + `effects.burst`, обработка респавна;
  `scene.draw(..., player, ...)`, `projectiles.draw`.
- HUD: показывать размер ×, урон и время полёта для атаки; длительность щита.

## Баланс — `src/config.ts` (блок `combat`)
```ts
combat: {
  dummyHp: 100,
  baseDamage: 50,
  referenceSizePx: 200,
  minSizeFactor: 0.5,
  maxSizeFactor: 2.0,
  referenceFlightMs: 1000,
  minSpeedFactor: 0.25,
  shieldMs: 10000,
  respawnMs: 1500,
}
```
Заменяет старый `damagePerPower`.

## Тестирование
- `tests/combat.test.ts` — `sizeFactor` (обрезка границ), `damageFor`,
  `speedFactor`, `flightTimeMs`.
- `tests/projectile.test.ts` — `quadraticPoint` (t=0/0.5/1), `arcControl`,
  `ProjectileSystem`: spawn → update(flightMs) → ровно один `Arrival` с верным
  уроном/цветом; несколько снарядов независимы.
- `tests/player.test.ts` — `castShield`, `tickPlayer` (отсчёт до 0, не уходит
  ниже 0), `isShielded`.
- Визуальные (scene, main) — вручную в браузере.

## Вне области
- Урон/HP по игроку, ИИ-контратака манекена, защитное поведение «Лечащего
  барьера», разные эффекты по стихиям, сетевой режим.
