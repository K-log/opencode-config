---
description: Create a git worktree with a new branch.
argument-hint: <branch-name> [--base <base-branch>] [--dir <worktree-dir>]
---

Arguments: `$ARGUMENTS`

Parse the following from arguments:

- First positional argument: new branch name (required). Used as both the branch name and the worktree directory name.
- `--base <branch>` or `-b <branch>`: base branch (optional).
- `--dir <path>` or `-d <path>`: worktree directory path (optional).

If no branch name is provided, report usage and stop:

```
Usage: /git-worktree <branch-name> [--base <base-branch>] [--dir <worktree-dir>]
```

**Resolve base branch** (if not provided):

1. Run `git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}'` to detect the remote default branch.
2. If that fails or returns empty, check local branches: `git branch --list main master develop` and use whichever exists first.
3. If still unresolved, use the `AskUserQuestion` tool to ask the user which branch to use as the base.

**Resolve worktree directory** (if not provided):

1. Run `git rev-parse --show-toplevel` to get the project root.
2. Default to `<project-root>/../worktrees/<branch-name>`.

**Review and approve — this step is mandatory and cannot be skipped:**

Present the exact command that will be executed to the user via the `AskUserQuestion` tool before running anything:

> The following command will be run:
>
> `git worktree add -b <branch-name> <worktree-dir> <base-branch>`
>
> Proceed?

Offer two options: `Yes, run it` and `Cancel`. Do not execute unless the user explicitly selects approval. If cancelled, stop immediately.

**Create the worktree:**

Run: `git worktree add -b <branch-name> <worktree-dir> <base-branch>`

Report the worktree path and branch name to the user on success.
