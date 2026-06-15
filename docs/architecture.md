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
- `combat/combat.ts` — чистая логика боя: `Combatant` (HP), `damageFor`, `applyDamage`, `respawn`.
- `combat/scene.ts` — `CombatScene`: отрисовка игрока, манекена, HP-бара и анимаций попадания.
- `ui/hud.ts` — текстовая обратная связь (`showCast`).
- `config.ts` — крутилки баланса (`minScore`, `clusterGapPx`, `combat`).
- `main.ts` — буфер линий, каст по пробелу, бой, отрисовка.

## Поток данных
ввод указателя → `StrokeRecorder` → буфер линий → (пробел) →
`clusterStrokes` → `recognize` по группам → `resolveCast` →
`damageFor` → `applyDamage` → `CombatScene` + `EffectSystem` + `Hud`.

## Что тестируется
Чистые модули (geometry, stroke, clustering, recognizer, combo, cast, combat) —
юнит-тестами Vitest. Визуальные модули — вручную в браузере.
