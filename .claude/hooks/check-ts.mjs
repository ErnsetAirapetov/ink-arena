#!/usr/bin/env node
// PostToolUse-хук на Write|Edit. Если тронут .ts — гоняем tsc --noEmit по проекту
// и возвращаем ошибки модели, чтобы она починила их сразу, а не в конце задачи.
// Не блокирует (правка уже применена), но выводит фидбек.

import { execSync } from 'node:child_process'

let raw = ''
process.stdin.setEncoding('utf8')
for await (const chunk of process.stdin) raw += chunk

let file = ''
try {
  file = JSON.parse(raw)?.tool_input?.file_path ?? ''
} catch {
  process.exit(0)
}
if (!/\.(ts|tsx)$/.test(file)) process.exit(0)

try {
  execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
} catch (e) {
  const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim()
  if (out) {
    console.error('tsc --noEmit нашёл ошибки типов — почини их до следующего шага:\n' + out.slice(0, 4000))
    process.exit(2)
  }
}
process.exit(0)
