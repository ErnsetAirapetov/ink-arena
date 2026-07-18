#!/usr/bin/env node
// Stop-хук: если в рабочем дереве тронуты src/ или tests/ — прогоняем тесты
// и сообщаем результат. Не блокирует остановку, но не даёт «закончить молча»
// с красными тестами.

import { execSync } from 'node:child_process'

let raw = ''
process.stdin.setEncoding('utf8')
for await (const chunk of process.stdin) raw += chunk

let data = {}
try {
  data = JSON.parse(raw) ?? {}
} catch {
  process.exit(0)
}
// Этот стоп уже блокировался нами — выходим, иначе красные тесты
// зациклят завершение сессии (стоп → exit 2 → работа → стоп → ...).
if (data.stop_hook_active) process.exit(0)

// Гоняем там, где реально работает агент (его worktree из cwd входа хука),
// а не в cwd процесса хука — иначе изменения агента не видны.
const cwd = data.cwd || process.cwd()
const sh = (c) => execSync(c, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

let changed = ''
try {
  changed = sh('git status --porcelain -- src tests')
} catch {
  process.exit(0)
}
if (!changed.trim()) process.exit(0)

try {
  sh('npm test --silent')
  console.error('Тесты зелёные (npm test).')
} catch (e) {
  const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim()
  console.error('npm test КРАСНЫЙ — задача не считается выполненной:\n' + out.slice(0, 4000))
  process.exit(2)
}
process.exit(0)
