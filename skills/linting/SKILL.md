---
name: linting
description: Linting and type checking standards: run the project's tooling before declaring a task done.
---

## Linting and Type Checking

- Before declaring a task done, run the project's linter and type-checker.
- Respect the project's existing linter and formatter config. Do not override or ignore it.
- Prefer existing project scripts for type checking, linting, or formatting over custom bash scripts.

## Code Review

After completing non-trivial code changes, invoke the `code-reviewer` subagent to review the work.
Use judgment, skip this for trivial edits (single-line changes, config tweaks, typo fixes, etc.).

Once the review is complete, present the findings to the user and ask which issues (if any) they want
fixed before the task is considered done.
