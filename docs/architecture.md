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
- `spells/spell-types.ts` — `parseSpell(results)`: атака/комбо/щит/осечка.
- `effects/effects.ts` — система частиц, цвета по id.
- `combat/combat.ts` — `Combatant` (HP + `statuses`), урон (`applyDamage`, `applyAttack`), `sizeFactor`, `damageFor`, `speedFactor`, `flightTimeMs`, `respawn`.
- `combat/status.ts` — статусы бойца: щит-пул со стаком и сродством (`addShield`, `tickStatuses`, `absorbIncoming`, `shieldInfo`).
- `combat/elements.ts` — сродство стихий (пентаграмма), `affinity(att, def)`.
- `combat/projectile.ts` — `ProjectileSystem`: снаряды по Безье-траектории (цель dummy/player, стихия), прилёты, отрисовка.
- `combat/dummy-ai.ts` — `DummyAi`: телеграф стихии и выстрел манекена по таймеру.
- `combat/scene.ts` — `CombatScene`: игрок (с аурой щита), манекен, HP-бар, анимации.
- `ui/hud.ts` — текстовая обратная связь (`showCast`, `showAttack`, `showShield`).
- `config.ts` — крутилки баланса (`minScore`, `clusterGapPx`, `combat`).
- `main.ts` — буфер линий, каст по пробелу, бой, отрисовка.

## Поток данных
ввод указателя → `StrokeRecorder` → буфер линий → (пробел) →
`clusterStrokes` → `recognize` по группам → `parseSpell` →
щит (`addShield`) на себя ИЛИ снаряд в манекен (`ProjectileSystem.spawn`).
Манекен по таймеру (`tickDummyAi`) телеграфит стихию и шлёт снаряд в игрока →
`applyAttack` (`absorbIncoming`: щит-пул со сродством) → `CombatScene` + `EffectSystem` + `Hud`.

## Что тестируется
Чистые модули (geometry, stroke, clustering, recognizer, combo, spell-types,
combat, status, elements, projectile, dummy-ai) — юнит-тестами Vitest.
Визуальные модули — вручную в браузере.
