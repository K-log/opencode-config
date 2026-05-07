# opencode config — NBD distribution

Personal opencode configuration and plugin pack for macOS.

## Install

```sh
git clone <repo-url> ~/.config/opencode
cd ~/.config/opencode
bun install
```

## Plugin: NBD

Modular plugin at `plugins/nbd/`. All modules enabled by default. Configure via `nbd.json`.

### Modules

| Module               | Description                                                                        |
| -------------------- | ---------------------------------------------------------------------------------- |
| session-logger       | Writes session records to `nbd/sessions/`                                          |
| decision-logger      | Logs decisions via `nbd_log_decision` tool                                         |
| cost-tracker         | Tracks LLM cost per session                                                        |
| auto-stage           | `git add` after each file edit                                                     |
| session-stats        | Writes session stats on idle                                                       |
| auto-format          | Runs prettier/gofmt/black on save                                                  |
| branch-guard         | Warns when on `main`/`master`                                                      |
| commit-guard         | No-op stub — SDK has no bash-intercept hook. Use `pre-commit-hook` module instead. |
| undo-stack           | Saves file content before edits for undo                                           |
| pre-commit-hook      | Installs `.git/hooks/pre-commit` on session start                                  |
| secret-scanner       | Detects secrets in edited files                                                    |
| test-on-save         | Runs tests when a `.test.ts` file is saved                                         |
| lint-on-save         | Runs eslint on `.ts`/`.js` files on save                                           |
| memory-sync          | Persists memory entries to `nbd/memory.json`                                       |
| context-injector     | Logs memory + decisions context to stderr                                          |
| audit-logger         | Appends file edits to `nbd/audit.jsonl`                                            |
| cost-cap             | Notifies when daily cost cap is exceeded                                           |
| telemetry            | Opt-in local telemetry to `nbd/telemetry/`                                         |
| recent-files-tracker | Tracks recently edited files                                                       |
| slack-notifier       | MCP stub: Slack notification on session end                                        |
| jira-link            | MCP stub: Jira context on session start                                            |
| github-pr            | MCP stub: PR reminder on session end                                               |
| figma-fetch          | MCP stub: Figma context on session start                                           |
| progress-bar         | Logs file edit progress to stderr                                                  |
| diff-preview         | Logs first 20 lines of edited file to stderr                                       |
| compact-mode         | Notes context compaction is managed by opencode                                    |

### Tools (nbd\_\* namespace)

| Tool                  | Description                        |
| --------------------- | ---------------------------------- |
| `nbd_memory_read`     | Read agent memory                  |
| `nbd_memory_write`    | Write to agent memory              |
| `nbd_log_decision`    | Log a decision with rationale      |
| `nbd_recent_files`    | List recently touched files        |
| `nbd_session_summary` | Get latest session summary         |
| `nbd_cost_report`     | Cost report aggregated by day      |
| `nbd_undo_last`       | Undo last file change              |
| `nbd_audit_log`       | Get recent audit log entries       |
| `nbd_notify`          | Send macOS notification            |
| `nbd_config_get`      | Get current NBD config             |
| `nbd_config_set`      | Set a config key                   |
| `nbd_module_status`   | Get module enabled/disabled status |
| `nbd_slack_notify`    | Slack message stub (requires MCP)  |
| `nbd_jira_link`       | Jira issue stub (requires MCP)     |
| `nbd_figma_fetch`     | Figma file stub (requires MCP)     |

### Config (`nbd.json`)

```json
{
  "modules": {
    "some-module": { "enabled": false }
  },
  "telemetry": false,
  "costCapUsd": null
}
```

All modules default to enabled. Set `enabled: false` to disable.

## Theme

Custom dark purple theme at `themes/alpenglow.json`. Set in `opencode.json`.

## Skills

Custom skills at `skills/`. Loaded via `skill` tool in agents.

## Agents

Custom agents at `agents/`. Includes `build-parallelizer`, `code-reviewer`, and others.

## Commands

Custom slash commands at `commands/`.

## Requirements

- macOS (notifier uses `osascript`)
- Bun >= 1.0
- opencode with plugin support
