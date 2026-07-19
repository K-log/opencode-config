# Migration notes: opencode-config → Claude Code

Full accounting of every piece of the opencode config: what was ported as-is,
what was adapted (and how), and what was skipped (and why).

## Concept mapping

| opencode                                  | Claude Code                                            |
| ----------------------------------------- | ------------------------------------------------------ |
| `AGENTS.md` (global rules)                | `~/.claude/CLAUDE.md`                                  |
| `opencode.json` `permission`              | `settings.json` `permissions.allow` rules              |
| `opencode.json` `default_agent: plan`     | `settings.json` `permissions.defaultMode: "plan"`      |
| `opencode.json` `formatter`               | `PostToolUse` hook                                     |
| `opencode.json` `mcp`                     | `claude mcp add --scope user` (stored in `~/.claude.json`) |
| `agent/*.md` (`mode: subagent`)           | `agents/*.md` subagents (Task tool)                    |
| `agent/*.md` (`mode: primary` / `all`)    | No equivalent — converted to slash commands            |
| `command/*.md` (+ `$ARGUMENTS`)           | `commands/*.md` (+ `$ARGUMENTS`, same syntax)          |
| `skills/*/SKILL.md`                       | `skills/*/SKILL.md` (identical format)                 |
| Plugins (TypeScript, `@opencode-ai/plugin`) | Hooks (any executable) or MCP servers                |
| `question` tool                           | `AskUserQuestion` tool                                 |
| `tui.json` (theme, keybinds)              | No custom-theme equivalent                             |

Systemic differences that shaped the port:

- **No primary-agent switching.** Claude Code custom agents are subagents
  only: they run non-interactively (no `AskUserQuestion`) and cannot spawn
  other subagents (no Task tool). Interactive multi-phase workflows therefore
  became slash commands that run in the main loop.
- **No per-agent bash allowlists.** opencode's fine-grained per-agent
  `permission.bash` maps (e.g. review-code may run `npx eslint` but not
  `git add`) have no per-subagent equivalent. Approximation used: restrict the
  agent's `tools:` frontmatter where possible (read-only agents get no Bash at
  all) and state command restrictions in the agent prompt; global read-only
  allows live in `settings.json`.
- **No `temperature`/`color` frontmatter.** Dropped; no equivalent.

## Ported

### Config

| Source                             | Destination                 | Notes                                                                                                                       |
| ---------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                        | `CLAUDE.md`                 | `question` → `AskUserQuestion`; `AI_TOOL=opencode` → `AI_TOOL=claude`. Terse-terminal response style kept verbatim.          |
| `opencode.json` permission allows  | `settings.json`             | Same read-only command set, rewritten in `Bash(cmd:*)` rule syntax. Plan-agent extras (`grep/head/tail/find/cat`) merged in. |
| `opencode.json` `default_agent`    | `settings.json`             | `permissions.defaultMode: "plan"`.                                                                                          |
| `opencode.json` prettier formatter | `hooks/format-markdown.mjs` | PostToolUse on `Edit\|Write\|MultiEdit`, prettier on `.md`/`.mdx` only.                                                      |
| `opencode.json` MCP (jira, figma)  | README instructions         | User-scope MCP lives in `~/.claude.json` (uncommittable per-machine file), so documented as `claude mcp add` commands.       |

### Plugins → hooks

| Source                   | Destination       | Notes                                                                                                                                                                                                        |
| ------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `plugins/notification.ts` | `hooks/notify.mjs` | Notification event → "action required" (critical); Stop event → "session complete" (sound). Debounce kept via tmp-file timestamps. Subagent suppression kept by simply not hooking SubagentStop. Todo-summary and session-title enrichment dropped — hooks don't receive todo state or session titles. |

### Agents (subagents)

All kept `description` verbatim (it drives delegation in both tools). JSON
tool-call syntax inside `<example>` blocks removed.

| Agent                   | Adaptation                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ask`                   | `tools: Read, Glob, Grep, WebFetch, WebSearch` (was edit/bash deny). "Ask the user when ambiguous" → answer each interpretation (non-interactive). |
| `review-code`           | `tools: Read, Glob, Grep, Bash`; bash allowlist became prompt-level restrictions. `opencode.json` in config-check list → `CLAUDE.md`.          |
| `check-regressions`     | Same approach as review-code.                                                                                                                  |
| `fetch-details`         | No `tools:` restriction (needs Jira MCP tools + `gh`); read-only rule stated in prompt.                                                        |
| `parallelize-task`      | `tools: Read, Glob, Grep, WebFetch, WebSearch`.                                                                                                |
| `plan-feature-analysis` | `tools: Read, Glob, Grep`.                                                                                                                     |
| `plan-feature-research` | Biggest change: opencode version delegated web research to the `ask` agent; Claude Code subagents can't spawn subagents, so it now does WebSearch/WebFetch research itself (ask's version-targeting rules inlined). |
| `plan-feature-tests`    | `tools: Read, Glob, Grep`; scans `.claude/agents/` instead of `.opencode/agents/`; "delegate to custom test agents" → "note them for the invoking agent" (can't delegate). |

### Primary agents → slash commands

| Source               | Destination               | Adaptation                                                                                                                                                                                                                                                                          |
| -------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `agents/orchestrate` | `/orchestrate`            | Phase structure, milestone loop, review adjudication, 3-attempt limits, and same-session change handling kept intact. opencode's enforced permissions (edit only plan file, no bash) became stated behavioral rules. `build` subagent → `general-purpose` subagent. Staging/commit now done by the orchestrator itself after `AskUserQuestion` approval (opencode had to delegate; the main loop doesn't). Plans move to `.claude/plans/`. |
| `agents/debug`       | `/debug`                  | 9-phase workflow kept. `explore`/`general` investigator subagents → `Explore` subagents. `edit: ask` permission gate → explicit `AskUserQuestion` before each fix. Subagent-invocation mode dropped (commands aren't invoked by agents).                                                 |

### Commands

| Command               | Adaptation                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `/add-todo`           | Todo list → TodoWrite.                                                                                  |
| `/git-commit`         | `AI_TOOL=opencode` → `AI_TOOL=claude`; `agent: build` frontmatter dropped; `allowed-tools` added.        |
| `/git-worktree`       | `question` → `AskUserQuestion`. (Claude Code also has native worktree support — kept anyway for the explicit approval flow.) |
| `/hostile-review`     | Already written dual-tool; opencode branches removed.                                                    |
| `/interactive-review` | `question` → `AskUserQuestion`.                                                                          |
| `/jira-refiner`       | `question` → `AskUserQuestion`; `$ARGUMENTS` made explicit.                                              |
| `/standup`            | `question` → `AskUserQuestion` (free-text entries use its "Other" input).                                |
| `/loop`               | Ported as-is. Note: some Claude Code surfaces ship a richer built-in `/loop` with scheduled wakeups — prefer it where available. |

### Skills

Format is identical; most ported verbatim.

| Skill             | Adaptation                                                          |
| ----------------- | ------------------------------------------------------------------- |
| `planning`        | `.opencode/plans/` → `.claude/plans/`.                              |
| `building`        | `build` agent → `general-purpose` subagent; orchestrator → `/orchestrate`. |
| `linting`         | `question` → `AskUserQuestion`.                                     |
| `package-manager` | `question` → `AskUserQuestion`.                                     |
| `pull-request`    | `question` → `AskUserQuestion`.                                     |
| `testing`         | opencode-specific `browser_run_code` naming generalized to Playwright-MCP tools. |
| `code-quality`, `css`, `react`, `typescript` | Verbatim.                                |

## Skipped

| Item                                              | Why                                                                                                                                                                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugins/bash-workdir.ts` + `skills/bash-workdir` | Entirely built around opencode's Bash `workdir` parameter, which Claude Code's Bash tool doesn't have. Claude Code's harness already discourages `cd`-prefixing and its permission matching handles common cases.                        |
| `plugins/ascii-draw.ts` + `scripts/` + `/draw`    | Depends on opencode's plugin custom-tool API and TUI prompt-injection (`client.tui.appendPrompt`). No hook/command equivalent; would require a from-scratch MCP server for a novelty feature. Revisit as an MCP server if actually missed. |
| `plugins/web-element.ts` + `extensions/web-element/` | Deeply coupled to the opencode SDK: session list API, TUI toasts/prompt injection, and the `chat.message` part-injection hook. None exist in Claude Code. A rebuild would be an MCP server the extension POSTs to, with captures exposed as MCP resources — a separate project, not a port. |
| `themes/` + `tui.json`                            | Claude Code has no custom TUI color-theme JSON; only built-in themes via `/config`. Keybinds were empty anyway.                                                                                                                          |
| `skills/create-opencode-plugin`                   | 512-line reference for opencode's plugin API — meaningless in Claude Code. (Claude Code's extension points are hooks, MCP, skills; its docs serve that role.)                                                                            |
| `@franlol/opencode-md-table-formatter` plugin     | Markdown formatting covered by the prettier PostToolUse hook.                                                                                                                                                                           |
| `opencode.json` `snapshot`, `compaction`, `experimental`, `lsp` | opencode-internal runtime knobs. Claude Code handles checkpointing/compaction natively with no user config.                                                                                                              |
| Per-agent `temperature` / `color`                 | No frontmatter equivalent.                                                                                                                                                                                                              |
| `agent.build` mode override                       | Existed only to expose opencode's built-in build agent to subagent delegation; Claude Code's `general-purpose` subagent fills that role out of the box.                                                                                  |

## Overlaps with Claude Code built-ins (ported anyway, know both exist)

- `/hostile-review` vs built-in `/review` and the `code-review` skill — the
  hostile two-pass verification flow is stricter; keep whichever you reach for.
- `planning` skill vs built-in plan mode — plan mode gates execution;
  the skill adds the persistent `.claude/plans/` file convention. They compose.
- `/git-worktree` vs native worktree sessions.
- `/add-todo` vs just telling Claude — kept for muscle memory.
