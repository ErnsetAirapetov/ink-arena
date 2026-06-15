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
- `ui/hud.ts` — текстовая обратная связь (`showCast`).
- `config.ts` — крутилки баланса (`minScore`, `clusterGapPx`).
- `main.ts` — буфер линий, отрисовка, каст по пробелу.

## Поток данных
ввод указателя → `StrokeRecorder` → буфер линий → (пробел) →
`clusterStrokes` → `recognize` по группам → `resolveCast` → `EffectSystem` + `Hud`.

## Что тестируется
Чистые модули (geometry, stroke, clustering, recognizer, combo, cast) —
юнит-тестами Vitest. Визуальные модули — вручную в браузере.
