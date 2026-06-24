---
name: bash-workdir
description: Use when running bash commands. Do not use `cd <dir> && <command>` — it creates permission mismatches when allowed patterns are defined (e.g. `npm test` is allowed but `cd /foo && npm test` is not). Use the Bash tool's workdir parameter instead. Check if already in the target directory before setting workdir.
---

## Bash Working Directory

Never prefix commands with `cd <dir> &&`. Use the `workdir` parameter on the Bash tool.

- Always set `workdir` to the target path when the command needs a specific directory.
- If the target is already the current working directory, omit `workdir` entirely.
- Never chain `cd ... &&`: the allowed pattern `npm test` does not match `cd /foo && npm test`, which triggers a redundant approval prompt.
- Shell state does not persist between tool calls. `cd` in one call has no effect on the next.

| Anti-pattern              | Correct                          |
|---------------------------|----------------------------------|
| `cd /foo && npm test`     | `npm test` with workdir=`/foo`   |
| `cd /foo && git status`   | `git status` with workdir=`/foo` |
| `cd /foo && cd bar && ls` | `ls` with workdir=`/foo/bar`     |
