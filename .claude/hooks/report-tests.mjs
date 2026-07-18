#!/usr/bin/env node
// Stop-хук: если в рабочем дереве тронуты src/ или tests/ — прогоняем тесты
// и сообщаем результат. Не блокирует остановку, но не даёт «закончить молча»
// с красными тестами.

import { execSync } from 'node:child_process'

const sh = (c) => execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

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
