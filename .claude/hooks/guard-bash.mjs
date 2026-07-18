#!/usr/bin/env node
// PreToolUse-хук на Bash/PowerShell. Блокирует нарушения git-процесса из CLAUDE.md.
// Блокировка = exit 2 + текст причины в stderr (он уходит модели как фидбек).

import { execSync } from 'node:child_process'

const OWNER_EMAIL = 'eriktarakan@gmail.com'

let raw = ''
process.stdin.setEncoding('utf8')
for await (const chunk of process.stdin) raw += chunk

let cmd = ''
try {
  cmd = JSON.parse(raw)?.tool_input?.command ?? ''
} catch {
  process.exit(0) // не смогли разобрать — не мешаем
}
if (!cmd) process.exit(0)

const deny = (why) => {
  console.error(why)
  process.exit(2)
}

const currentBranch = () => {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

// 1. Коммит или пуш в main
if (/\bgit\s+commit\b/.test(cmd) && currentBranch() === 'main') {
  deny(
    'Запрещено коммитить в main. Процесс: заведи ветку и worktree ' +
      '(git worktree add .claude/worktrees/<ветка> -b <ветка>), работай там, ' +
      'изменения попадают в main только через PR. См. CLAUDE.md.'
  )
}
if (/\bgit\s+push\b.*\b(origin\s+)?main\b/.test(cmd) || /\bgit\s+push\b.*\bHEAD:main\b/.test(cmd)) {
  deny('Запрещено пушить напрямую в main. Создай PR: gh pr create --base main.')
}

// 2. Обход проверок
if (/--no-verify|--no-gpg-sign/.test(cmd)) {
  deny('Обход хуков (--no-verify / --no-gpg-sign) запрещён. Почини причину, а не проверку.')
}

// 3. Чужое авторство в коммитах
if (/\bgit\s+commit\b/.test(cmd)) {
  if (/Co-Authored-By/i.test(cmd)) {
    deny(
      `Trailer Co-Authored-By запрещён. Автор коммитов только владелец (${OWNER_EMAIL}), ` +
        'упоминание ассистентов в авторстве недопустимо. См. CLAUDE.md.'
    )
  }
  if (/(claude|anthropic|assistant|noreply@anthropic)/i.test(cmd)) {
    deny(
      'В сообщении коммита есть упоминание ассистента. Это запрещено разделом ' +
        '«Соглашения» в CLAUDE.md — перепиши сообщение по существу изменений.'
    )
  }
  const author = cmd.match(/--author[= ]+["']?([^"']+)/)
  if (author && !author[1].includes(OWNER_EMAIL)) {
    deny(`--author должен быть ${OWNER_EMAIL}, получено: ${author[1]}`)
  }
}

// 4. Разрушительные операции над историей и worktree
if (/\bgit\s+push\b.*(--force(?!-with-lease)|\s-f\b)/.test(cmd)) {
  deny('git push --force запрещён. Если правда нужно — только --force-with-lease и с ветки задачи.')
}
if (/\bgit\s+reset\s+--hard\b/.test(cmd) && /\borigin\/main\b/.test(cmd)) {
  deny('git reset --hard origin/main затрёт работу. Используй git stash или новую ветку.')
}

process.exit(0)
