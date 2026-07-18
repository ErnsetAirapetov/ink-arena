---
description: Состояние доски — что ждёт моего решения, что в работе, что готово
---

Открытые issue: !`gh issue list --state open --limit 50 --json number,title,labels,createdAt`

Требуют моего решения: !`gh issue list --state open --label needs-decision --json number,title`

Заблокировано: !`gh issue list --state open --label blocked --json number,title`

Открытые PR: !`gh pr list --json number,title,headRefName,isDraft,statusCheckRollup`

Живые worktree: !`git worktree list`

Ветки: !`git branch -vv`

Собери из этого короткую сводку **для человека, который не читает код**:

1. **Требует твоего решения** — по каждой issue с `needs-decision` дай суть
   вопроса в одном предложении, варианты и свою рекомендацию.
2. **В работе** — что делается прямо сейчас, есть ли зависшие worktree без PR
   (признак упавшего агента).
3. **Ждёт мержа** — PR, готовые к `/land`.
4. **Бэклог** — сгруппируй по `epic:`, покажи 5 верхних задач, готовых к запуску.
5. **Аномалии** — issue без меток, PR без issue, worktree без ветки, ветки без
   PR, issue старше недели без движения.

Без простыней. Списками, по делу.
