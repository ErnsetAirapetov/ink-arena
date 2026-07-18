# CLAUDE.md — InkArena

InkArena — веб-игра про рисование заклинаний. Кодовая база вехи 1 — monorepo
на npm workspaces: `packages/core` (детерминированное ядро без DOM) и
`packages/client` (веб-клиент на Vite + Canvas). Тех-дизайн — в
`docs/tech/architecture.md`. Параллельно идёт GDD в `docs/game/`, кухня
проработки — `docs/design/` (см. `docs/README.md`). Прототип снесён начисто
(Р43) и сохранён тегом `prototype-archive`.

## Стек
TypeScript + HTML5 Canvas + Vite. Тесты — Vitest. Распознавание — алгоритм $P.
Python в MVP не используется (запланирован как сервер позже).

## Команды
- `npm run dev` — дев-сервер.
- `npm test` — юнит-тесты.
- `npm run build` — сборка.

## Процесс — из плагина harness-core

Роли агентов, ритуалы (/board, /groom, /task, /land, /handoff), git-гейты и
иерархия задач (Веха → Эпик → Задача) приходят из плагина `harness-core`.
Привязки этого репозитория:

- `.claude/harness.json` — главная ветка, проверки;
- `.claude/forge.md` — команды доски (GitHub Issues, `gh` CLI);
- `.claude/orchestrator.md` — персона оркестратора (Индиго).

Проектное поверх процесса:

- Доска — GitHub Issues, работа через `gh` напрямую (НЕ через GitHub MCP —
  он грузит лишние схемы и жрёт токены).
- Направления: `area:gdd`, `area:recognition`, `area:combat`, `area:netcode`,
  `area:infra`.
- Задачи, затрагивающие код, не выполняются мимо доски.
- Документационные задачи исполняет проектный агент `gdd-writer`.

## Соглашения предметного слоя
- TDD для чистых модулей ядра
  (`packages/core/src/{geometry,recognition,spellcraft,sim}`). Визуальные
  модули клиента (рендер, ввод, HUD, экраны) проверяются вручную в браузере.
- Баланс — только в `packages/core/src/config.ts`, никаких магических чисел
  в логике.
- Вся документация и планы — в `docs/`.
- Аккаунт `airerik@yandex.ru` забанен — не использовать нигде.

## Структура
Документация — `docs/README.md`. Архитектура прототипа —
`docs/prototype/architecture.md`.
