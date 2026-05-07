# Plan: nbd-distribution -- base plan

> Status: BASE PLAN. Not yet broken into milestones or parallel phases.
> Use `task-parallelizer` agent to convert into work plan when ready.

## Context

Transform `nbd-plugin.ts` from a single-file plugin into a full opencode
distribution -- a "plugin pack" / "vim distribution" style batteries-included
experience built on top of opencode. The entire `~/.config/opencode/` repo is
the distribution; cloning it gives the user a complete working setup.

### Scope decisions (locked)

| Decision           | Answer                                                                    |
| ------------------ | ------------------------------------------------------------------------- |
| Audience           | Personal now, team later                                                  |
| Module default     | All modules enabled by default; opt-out via config                        |
| Persistence        | Global -- `~/.config/opencode/nbd/` (not per-project `.opencode/`)        |
| Distribution shape | One pack -- plugins + agents + commands + theme + skills shipped together |
| Install method     | `git clone <repo> ~/.config/opencode`                                     |

## Architecture

Refactor `plugins/nbd-plugin.ts` into modular `plugins/nbd/` directory.
Each module is independent, opts in/out via config, exports hooks composed by
the entry point.

```
plugins/nbd/
  index.ts                   # entry; loads config, composes enabled modules
  config.ts                  # reads "nbd" key from opencode.json, applies defaults
  types.ts                   # shared types
  lib/
    paths.ts                 # ~/.config/opencode/nbd/ path helpers
    storage.ts               # JSONL/JSON read/write helpers
    notifier.ts              # extracted from current plugin
    terminal.ts              # bundle-id detection from current plugin
  modules/
    notifications.ts
    secrets-guard.ts
    compaction.ts
    auto-stage.ts
    session-stats.ts
    cost-tracker.ts
    auto-format.ts
    branch-guard.ts
    commit-guard.ts
    undo-stack.ts
    project-memory.ts
    recent-files.ts
    context-budget.ts
    decision-log.ts
    pre-commit-hook.ts
    test-on-save.ts
    secret-scanner.ts
    lint-on-save.ts
    slack-notifier.ts
    jira-link.ts
    github-pr.ts
    figma-fetch.ts
    prompt-templates.ts
    toast-on-error.ts
    audit-log.ts
    permission-presets.ts
    rate-limiter.ts
    cost-cap.ts
    theme-rotator.ts
    status-line.ts
  tools/                     # custom tools shipped with the distribution
    nbd_project_info.ts
    nbd_run_tests.ts
    nbd_diff_summary.ts
    nbd_token_count.ts
    nbd_grep_history.ts
    nbd_recall.ts
    nbd_screenshot.ts
    nbd_clipboard.ts
    nbd_open.ts
    nbd_undo.ts
    memory_read.ts
    memory_write.ts
    log_decision.ts
    recent_files.ts
    create_pr.ts
```

Global state directory:

```
~/.config/opencode/nbd/
  sessions/<id>.json         # session-stats
  memory.md                  # project-memory (keyed per project inside)
  decisions.md               # decision-log
  undo/<session>/<n>.diff    # undo-stack snapshots
  audit/<YYYY-MM-DD>.jsonl   # audit-log
  recent-files.json          # recent-files cache
  cost.json                  # cost-tracker rolling totals
```

## Config schema

Add `nbd` key to `opencode.json`. All modules default to enabled.

```json
{
  "nbd": {
    "modules": {
      "notifications": { "enabled": true },
      "secrets-guard": { "enabled": true },
      "compaction": { "enabled": true },
      "auto-stage": { "enabled": true, "skipIfPreCommit": true },
      "session-stats": { "enabled": true, "persist": true },
      "cost-tracker": { "enabled": true, "budgetUSD": 10, "warnAt": 0.8 },
      "auto-format": { "enabled": true },
      "branch-guard": {
        "enabled": true,
        "protected": ["main", "master", "production"]
      },
      "commit-guard": { "enabled": true },
      "undo-stack": { "enabled": true, "maxPerSession": 50 },
      "project-memory": { "enabled": true },
      "recent-files": { "enabled": true, "max": 20 },
      "context-budget": { "enabled": true, "warnAt": 0.7, "compactAt": 0.85 },
      "decision-log": { "enabled": true },
      "pre-commit-hook": { "enabled": true },
      "test-on-save": { "enabled": true },
      "secret-scanner": { "enabled": true, "patterns": [] },
      "lint-on-save": { "enabled": true },
      "slack-notifier": { "enabled": true, "channel": null },
      "jira-link": { "enabled": true },
      "github-pr": { "enabled": true },
      "figma-fetch": { "enabled": true },
      "prompt-templates": {
        "enabled": true,
        "snippets": {
          ";plan": "Create a plan for: ",
          ";rev": "Review @",
          ";fix": "Fix the bug in @",
          ";test": "Write tests for @"
        }
      },
      "toast-on-error": { "enabled": true },
      "audit-log": { "enabled": true },
      "permission-presets": { "enabled": true, "default": "balanced" },
      "rate-limiter": { "enabled": true, "callsPerMinute": 120 },
      "cost-cap": { "enabled": true, "hardCapUSD": 25 },
      "theme-rotator": {
        "enabled": false,
        "day": "alpenglow",
        "night": "alpenglow"
      },
      "status-line": { "enabled": true }
    }
  }
}
```

To disable a module:

```json
{ "nbd": { "modules": { "auto-format": { "enabled": false } } } }
```

## Module catalog

### Workflow / DX

| Module          | Hook(s)                                              | Behavior                                                                                              |
| --------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `auto-stage`    | `tool.execute.after` on `edit`/`write`               | `git add` modified files. Skip when pre-commit hooks would re-run.                                    |
| `session-stats` | `chat.message`, `tool.execute.after`, `session.idle` | Track tokens, tool calls, duration, files touched. Persist to `~/.config/opencode/nbd/sessions/`.     |
| `cost-tracker`  | `message.part.updated`, `session.idle`               | Estimate $ per session from token counts + provider rates. Warn at `warnAt`, hard-stop at `cost-cap`. |
| `auto-format`   | `tool.execute.after` on `edit`/`write`               | Run project formatter on touched file. Respect project config; no-op if no formatter detected.        |
| `branch-guard`  | `tool.execute.before` on `edit`/`write`/`bash`       | Block writes/commits on protected branches. Surface error to agent.                                   |
| `commit-guard`  | `tool.execute.before` on `bash`                      | Intercept `git commit` calls; force AI-generated commits through `/git-commit` flow.                  |
| `undo-stack`    | `tool.execute.before` on `edit`/`write`              | Snapshot pre-edit content. Custom tool `nbd_undo` reverts last N changes.                             |

### Context / Memory

| Module           | Hook(s)                               | Behavior                                                                                                     |
| ---------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `project-memory` | tools `memory_read`, `memory_write`   | Persist `~/.config/opencode/nbd/memory.md` keyed per project. Long-lived agent notes.                        |
| `recent-files`   | `tool.execute.after`, compaction hook | Track last 20 files touched across sessions. Inject into compaction. Tool `recent_files`.                    |
| `context-budget` | `message.part.updated`                | Compute % context used. Warn agent at `warnAt`. Force compaction at `compactAt`.                             |
| `decision-log`   | tool `log_decision`                   | Append to `~/.config/opencode/nbd/decisions.md` with timestamp + session + rationale. Surface in compaction. |

### Quality gates

| Module            | Hook(s)                                 | Behavior                                                                                   |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `pre-commit-hook` | `tool.execute.before` on `bash`         | Intercept `git commit`; auto-run lint+typecheck; block on failure.                         |
| `test-on-save`    | `tool.execute.after` on `edit`/`write`  | Run related tests for touched test-adjacent files. Inject failures into agent's next turn. |
| `secret-scanner`  | `tool.execute.before` on `edit`/`write` | Regex-scan content for API keys, tokens, AWS creds. Block + warn.                          |
| `lint-on-save`    | `tool.execute.after` on `edit`/`write`  | Lint touched file. Inject errors back into agent prompt.                                   |

### Integrations

| Module           | Hook(s)           | Behavior                                                                            |
| ---------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `slack-notifier` | `session.idle`    | DM session summary + resume link via Slack MCP.                                     |
| `jira-link`      | `session.created` | Detect ticket ID in branch name. Fetch via Jira MCP. Inject summary into context.   |
| `github-pr`      | tool `create_pr`  | Push branch, create PR via `gh`, draft description from commits.                    |
| `figma-fetch`    | `chat.message`    | Detect Figma URLs in user prompts. Auto-fetch via Figma MCP. Inject design context. |

### TUI / UX

| Module             | Hook(s)                                | Behavior                                                                                  |
| ------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `prompt-templates` | `tui.prompt.append`                    | Snippet expansion: `;plan` -> "Create a plan for...", `;rev` -> "Review @", configurable. |
| `toast-on-error`   | `session.error`                        | Show non-blocking `tui.toast.show` instead of/in addition to system notification.         |
| `status-line`      | `message.part.updated`, `session.idle` | Inject status into terminal title via OSC escape: agent, model, token %, $.               |

### Safety / Governance

| Module               | Hook(s)                       | Behavior                                                                 |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `audit-log`          | `tool.execute.before`/`after` | Append to `~/.config/opencode/nbd/audit/<date>.jsonl`. Compliance trail. |
| `permission-presets` | `session.created`             | Profiles: `strict` / `balanced` / `yolo`. Switch via custom tool.        |
| `rate-limiter`       | `tool.execute.before`         | Cap tool calls per minute. Prevent runaway loops.                        |
| `cost-cap`           | `message.part.updated`        | Hard $ cap per session; abort on breach.                                 |

### Theming

| Module          | Hook(s)           | Behavior                                          |
| --------------- | ----------------- | ------------------------------------------------- |
| `theme-rotator` | `session.created` | Time-of-day theme switching. Disabled by default. |

### Carryovers (existing behavior preserved)

| Module          | Source                                                                   |
| --------------- | ------------------------------------------------------------------------ |
| `notifications` | Current `session.idle`/`session.error`/`permission.updated` notify logic |
| `secrets-guard` | Current `.env`/`.secrets` block in `tool.execute.before`                 |
| `compaction`    | Current `experimental.session.compacting` re-read-rules logic            |

## Custom tools (shipped with distribution)

| Tool               | Returns                                                               |
| ------------------ | --------------------------------------------------------------------- |
| `nbd_project_info` | branch, recent commits, package manager, framework, package.json info |
| `nbd_run_tests`    | Detect runner; run scoped tests; structured pass/fail/error           |
| `nbd_diff_summary` | Structured `git diff --stat` + `--name-only`                          |
| `nbd_token_count`  | Token count for file or string (tiktoken)                             |
| `nbd_grep_history` | Search past session transcripts                                       |
| `nbd_recall`       | Semantic-ish search over `memory.md` + `decisions.md`                 |
| `nbd_screenshot`   | macOS `screencapture`; returns path agent can read                    |
| `nbd_clipboard`    | Read/write macOS clipboard                                            |
| `nbd_open`         | Open URL/file in default app (`open` on macOS)                        |
| `nbd_undo`         | Revert last N edits in current session via undo-stack                 |
| `memory_read`      | Read project-memory                                                   |
| `memory_write`     | Append to project-memory                                              |
| `log_decision`     | Append entry to decision-log                                          |
| `recent_files`     | Return list of last N files touched                                   |
| `create_pr`        | Push branch, create PR via `gh`, draft description from commits       |

## Distribution-pack additions

Beyond plugin modules and tools, the pack includes:

### Agents

- `debug` -- targeted debugging workflow (primary mode)
- `refactor` -- safe rename/extract/inline (subagent)

### Commands

- `/lint` -- run project linter+typecheck, report and offer fixes
- `/test` -- detect runner, run tests, report failures
- `/pr-summary` -- generate PR description from git diff
- `/explain` -- explain selected file or function (agent: ask)
- Rename `/interative-review` -> `/interactive-review`; tighten spec

### Theme

- Fix `alpenglow.json` contrast: bump `text2` to ~`#A0A0BC`
- Differentiate `info` (use `sky`) from `secondary` (`indigo`)
- Add `markdownTable` / `markdownTableHeader` if supported

### Existing agent fixes (folded into pack)

- `code-reviewer`: scoped bash allow-list (`npx eslint *`, `npx tsc *`, etc.)
- `build-parallelizer`: dedupe destructive deny list with `opencode.json`
- `plan-feature-research`: allow `jq *` for lock-file parsing

### `opencode.json` adjustments

- Verify `agent.build` permission block uses correct nested schema
- Add `"lsp": true`
- Add `"watcher": { "ignore": ["node_modules/**", ".git/**", "dist/**", "build/**"] }`
- Reconsider `compaction.reserved: 20000` -- drop to 10000 unless needed
- Remove `cat`/`head`/`tail`/`grep`/`find` bash allows (enforce tool usage)
- Add `"autoupdate": true | "notify"`

### `tui.json` adjustments

- Drop trailing comma
- Add explicit `scroll_speed`, `diff_style`, `mouse`
- Add keybinds: `ctrl+r` -> `/interactive-review`, `ctrl+g` -> `/git-commit`

## Phasing (high-level, not yet a work plan)

| Phase | Theme                       | Outcome                                                                                                     |
| ----- | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1     | Refactor                    | `nbd-plugin.ts` -> `plugins/nbd/` modular structure. No behavior change. Tests pass.                        |
| 2     | Tier-1 modules              | `auto-stage`, `session-stats`, `secret-scanner`, `pre-commit-hook`, `cost-tracker`                          |
| 3     | Custom tools bundle         | All `nbd_*`, `memory_*`, `log_decision`, `recent_files`                                                     |
| 4     | Context / memory modules    | `project-memory`, `recent-files`, `context-budget`, `decision-log`                                          |
| 5     | Quality gate modules        | `test-on-save`, `lint-on-save`, `auto-format`                                                               |
| 6     | TUI / UX modules            | `prompt-templates`, `toast-on-error`, `status-line`                                                         |
| 7     | Safety / governance modules | `audit-log`, `permission-presets`, `rate-limiter`, `cost-cap`, `branch-guard`, `commit-guard`, `undo-stack` |
| 8     | Integration modules         | `slack-notifier`, `jira-link`, `github-pr`, `figma-fetch`                                                   |
| 9     | Pack additions              | New agents, commands, theme fixes, opencode.json/tui.json adjustments                                       |
| 10    | Docs + README               | Install guide, module catalog, config reference                                                             |

## Design decisions (locked)

| #   | Question              | Decision                                                                                  |
| --- | --------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Config location       | `nbd` key inside `opencode.json` (single source of truth)                                 |
| 2   | Module dependencies   | Warn + auto-enable upstream (e.g. enabling `cost-cap` auto-enables `cost-tracker` + logs) |
| 3   | Per-project overrides | Yes -- `.opencode/nbd/` in project shadows global `~/.config/opencode/nbd/`               |
| 4   | Versioning            | Tag v0.1.0 on the repo after implementation completes                                     |
| 5   | Tool namespace        | All custom tools use `nbd_` prefix (including `nbd_memory_read`, `nbd_log_decision`, etc) |
| 6   | Test strategy         | Vitest unit tests for all modules                                                         |
| 7   | Telemetry             | Opt-in, local-only JSONL at `~/.config/opencode/nbd/telemetry/<YYYY-MM-DD>.jsonl`         |

## Post-implementation

1. Run linter + typecheck on all plugin TS files
2. Run plugin smoke tests in a scratch project
3. Code review of full distribution
4. Update `README.md` with install + module catalog
5. Tag v0.1.0 release on the repo

## References

- opencode plugins docs: https://opencode.ai/docs/plugins
- opencode custom tools docs: https://opencode.ai/docs/custom-tools
- opencode skills docs: https://opencode.ai/docs/skills
- opencode config docs: https://opencode.ai/docs/config
- Bun shell API: https://bun.com/docs/runtime/shell
- Plugin events list: see opencode plugins docs section "Events"
