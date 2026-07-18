Фордж: GitHub (gh CLI)

| действие | команда |
|---|---|
| список задач | gh issue list --state open --limit 50 --json number,title,labels |
| прочитать задачу | gh issue view <N> |
| создать задачу | gh issue create --title "<t>" --body-file <f> --label <l> |
| комментарий к задаче | gh issue comment <N> -b "<текст>" |
| пометить решением | gh issue edit <N> --add-label needs-decision |
| закрыть задачу | gh issue close <N> -c "<итог>" |
| список PR | gh pr list --json number,title,headRefName,statusCheckRollup |
| прочитать PR / дифф | gh pr view <N> / gh pr diff <N> |
| создать PR | gh pr create --base main --title "<t>" --body "<b>" (в теле: Closes #N) |
| смержить PR | gh pr merge <N> --squash --delete-branch |
