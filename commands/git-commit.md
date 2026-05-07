---
description: Commit staged changes following project commit conventions.
agent: build
---

- Run `git log --oneline -10` to infer the project's commit message style and format.
- Run `git diff --cached --stat` to summarize what is staged.
- If nothing is staged, run `git status` and report what is unstaged — do not proceed.
- Draft a commit message that follows the inferred style. If the current branch name contains a ticket number (e.g. `PROJ-1234`), prefix the message with it in brackets: `[PROJ-1234] message`.
- Present the proposed commit message to the user via the `question` tool and ask for approval before committing.
- Command to run: `AI_ASSIST=yes AI_MODE=generated git commit -m "<message>"`
- On rejection or edit request, revise the message and re-present via `question` tool before committing.
- Never use `--no-verify`, `--amend` unless the user explicitly requests it.
- Never force-push.
- Keep commit messages brief and human-readable.
  - 50 character maximum for commit messages
  - (optional) Up to 2 lines for the commit description
