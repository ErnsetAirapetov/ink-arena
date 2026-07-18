#!/usr/bin/env node
// PostToolUse-хук на Write|Edit. Если тронут .ts — гоняем tsc --noEmit в проекте
// правимого файла (ближайший package.json вверх — работает и в worktree агента)
// и возвращаем ошибки модели, чтобы она чинила их сразу, а не в конце задачи.
// Не блокирует (правка уже применена), но выводит фидбек.

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

let raw = ''
process.stdin.setEncoding('utf8')
for await (const chunk of process.stdin) raw += chunk

let data = {}
try {
  data = JSON.parse(raw) ?? {}
} catch {
  process.exit(0)
}
const file = data?.tool_input?.file_path ?? ''
if (!/\.(ts|tsx)$/.test(file)) process.exit(0)

// Каталог проекта файла: вверх до ближайшего package.json.
let dir = path.dirname(path.resolve(file))
while (dir !== path.dirname(dir) && !fs.existsSync(path.join(dir, 'package.json'))) {
  dir = path.dirname(dir)
}
const cwd = fs.existsSync(path.join(dir, 'package.json')) ? dir : data.cwd || process.cwd()

try {
  execSync('npx tsc --noEmit', { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
} catch (e) {
  const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim()
  if (out) {
    console.error('tsc --noEmit нашёл ошибки типов — почини их до следующего шага:\n' + out.slice(0, 4000))
    process.exit(2)
  }
}
process.exit(0)
