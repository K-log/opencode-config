# claude-code-config

Personal Claude Code configuration, ported from
[K-log/opencode-config](https://github.com/K-log/opencode-config). This
directory is laid out exactly like `~/.claude`, so it can be used directly as
your user-level Claude Code config. See `MIGRATION.md` for a full accounting
of what was ported, what was adapted, and what was intentionally skipped.

## Layout

| Path                        | Purpose                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `CLAUDE.md`                 | Global rules/memory (ported from `AGENTS.md`)                      |
| `settings.json`             | Permissions, plan-mode default, hooks (ported from `opencode.json`) |
| `agents/`                   | Custom subagents (invoked via the Task tool)                       |
| `commands/`                 | Slash commands (`/orchestrate`, `/debug`, `/git-commit`, ...)      |
| `skills/`                   | Skills (same `SKILL.md` format as opencode)                        |
| `hooks/notify.mjs`          | Desktop notifications (Notification + Stop hook events)            |
| `hooks/format-markdown.mjs` | Prettier on `.md`/`.mdx` after Edit/Write (PostToolUse hook)       |

## Install

### Option A — clone as `~/.claude` (fresh machine)

```
git clone git@github.com:K-log/claude-code-config.git ~/.claude
```

### Option B — symlink into an existing `~/.claude`

```
git clone git@github.com:K-log/claude-code-config.git ~/code/claude-code-config
cd ~/code/claude-code-config
ln -s "$PWD/CLAUDE.md"      ~/.claude/CLAUDE.md
ln -s "$PWD/settings.json"  ~/.claude/settings.json
ln -s "$PWD/agents"         ~/.claude/agents
ln -s "$PWD/commands"       ~/.claude/commands
ln -s "$PWD/skills"         ~/.claude/skills
ln -s "$PWD/hooks"          ~/.claude/hooks
```

Note: the hook commands in `settings.json` reference
`$HOME/.claude/hooks/...`, so the `hooks` directory must be reachable at that
path (either option above satisfies this).

## MCP servers

opencode configured MCP servers in `opencode.json`; Claude Code stores
user-scoped MCP servers in `~/.claude.json`, which also holds per-machine
state and should not be committed. Re-add them once per machine:

```
claude mcp add --scope user --transport http jira https://mcp.atlassian.com/v1/mcp
claude mcp add --scope user --transport http figma http://127.0.0.1:3845/mcp
```

(Figma requires the Figma desktop app's local Dev Mode MCP server to be
running; Jira will walk through OAuth on first use.)

## Extracting this directory into its own repo

This config was developed inside `opencode-config` under `claude-code/`. To
split it into the standalone repo:

```
# from a clone of opencode-config
git subtree split -P claude-code -b claude-code-config
# create the new empty repo on GitHub (e.g. K-log/claude-code-config), then:
git push git@github.com:K-log/claude-code-config.git claude-code-config:main
```

(Or simply copy the `claude-code/` directory contents into a new `git init`
repo if history doesn't matter.)

## Notable behavior

- **Plan mode by default**: `permissions.defaultMode` is `"plan"`, matching
  opencode's `default_agent: plan`. Use Shift+Tab to switch to accept-edits
  mode when ready to build.
- **Notifications**: `hooks/notify.mjs` fires on permission prompts
  (critical urgency) and session completion (normal + completion sound).
  Cross-platform: `notify-send`/`paplay` (Linux), `osascript` (macOS),
  PowerShell toast (Windows).
- **Markdown formatting**: prettier runs automatically on any `.md`/`.mdx`
  file Claude edits or writes.
- **Orchestrated workflow**: `/orchestrate <task or ticket>` runs the full
  requirements → research → analysis → plan → build/review/commit loop using
  the `fetch-details`, `plan-feature-research`, `plan-feature-analysis`,
  `plan-feature-tests`, `parallelize-task`, `review-code`, and
  `check-regressions` subagents.
