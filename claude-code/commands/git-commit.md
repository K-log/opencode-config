---
description: Commit staged changes following project commit conventions.
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(git status), Bash(git commit:*), AskUserQuestion
---

- Run `git log --oneline -10` to infer the project's commit message style and format.
- Run `git diff --cached --stat` to summarize what is staged.
- If nothing is staged, run `git status` and report what is unstaged — do not proceed.
- Draft a commit message that follows the inferred style. If the current branch name contains a ticket number (e.g. `PROJ-1234`), prefix the message with it in brackets: `[PROJ-1234] message`.
- Present the proposed commit message to the user via the `AskUserQuestion` tool and ask for approval before committing.
- Command to run: `AI_ASSIST=yes AI_TOOL=claude AI_MODE=generated git commit -m "<subject>"` (or, with a description, `AI_ASSIST=yes AI_TOOL=claude AI_MODE=generated git commit -m "<subject>" -m "<description>"`).
- On rejection or edit request, revise the message and re-present via `AskUserQuestion` tool before committing.
- Never use `--no-verify`, `--amend` unless the user explicitly requests it.
- Never force-push.
- Keep commit messages brief and human-readable.
  - 50 character maximum for the commit subject line
  - If a description is needed, add it as a second `-m` flag: `git commit -m "<subject>" -m "<description, up to 2 lines>"`
