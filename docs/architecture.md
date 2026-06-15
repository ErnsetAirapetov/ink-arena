# Архитектура

Чистый TypeScript без игрового движка. Модули изолированы и общаются через
простые интерфейсы.

## Модули
- `geometry.ts` — тип `Point`, расстояние, длина пути. Чистые функции.
- `drawing/stroke.ts` — `StrokeRecorder`: накопление точек в `Stroke`. Без DOM.
- `drawing/canvas-renderer.ts` — отрисовка живого следа чернил.
- `recognition/glyphs.ts` — эталоны глифов.
- `recognition/recognizer.ts` — алгоритм $P: `recognize(points, templates)`.
- `spells/spell-system.ts` — сборка `Spell` (power, скорость, успех).
- `spells/combo.ts` — `ComboTracker`: последовательность глифов в окне времени.
- `effects/effects.ts` — система частиц.
- `combat/combat.ts` — чистая логика боя: `Combatant` (HP), `damageFor`, `applyDamage`, `respawn`.
- `combat/scene.ts` — `CombatScene`: отрисовка игрока, манекена, HP-бара и анимаций попадания.
- `ui/hud.ts` — текстовая обратная связь.
- `config.ts` — числовые крутилки баланса.
- `main.ts` — связывает ввод → распознавание → заклинание → эффект + HUD.

## Поток данных
ввод указателя → `StrokeRecorder` → `recognize()` → `buildSpell()` →
`ComboTracker.push()` → `damageFor()` → `applyDamage()` → `CombatScene` +
`EffectSystem` + `Hud`.

## Что тестируется
Чистые модули (geometry, stroke, recognizer, spell-system, combo, combat) —
юнит-тестами Vitest. Визуальные модули — вручную в браузере.
