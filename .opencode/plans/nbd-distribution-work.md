# Plan: nbd-distribution-work -- NBD opencode distribution: modular plugin pack

## Status Legend

- [ ] pending
- [~] in progress
- [x] done

## Milestones

### Milestone 1: Foundation [ ]

Scaffold `plugins/nbd/` directory structure. Implement shared libs (`paths.ts`, `storage.ts`, `notifier.ts`), `config.ts`, `types.ts`. Port carryover modules from `nbd-plugin.ts`. Set up Vitest. Update `opencode.json` plugin entry. Delete `plugins/nbd-plugin.ts`.

#### Phase 1A (parallel)

- [ ] Create `plugins/nbd/lib/paths.ts` — all canonical path constants (`CONFIG_FILE`, `STATE_DIR`, `SESSIONS_DIR`, `MEMORY_FILE`, `DECISIONS_FILE`, `UNDO_FILE`, `AUDIT_FILE`, `RECENT_FILES_FILE`, `COST_FILE`, `TELEMETRY_DIR`)
- [ ] Create `plugins/nbd/types.ts` — all shared TypeScript types and interfaces (`NbdConfig`, `ModuleConfig`, `SessionRecord`, `CostRecord`, `DecisionRecord`, `UndoEntry`, `AuditEntry`, `RecentFile`, `TelemetryEvent`)

#### Phase 1B (parallel, after 1A)

- [ ] Create `plugins/nbd/lib/storage.ts` — generic JSONL append, JSON read/write helpers using `Bun.file` / `Bun.write`
- [ ] Create `plugins/nbd/lib/notifier.ts` — `notify(title, body)` via `osascript`; no external deps
- [ ] Create `plugins/nbd/config.ts` — reads `~/.config/opencode/nbd.json` at startup; merges defaults (all modules on); exports `getConfig()` and `isModuleEnabled(name)`

#### Phase 1C (parallel, after 1B)

- [ ] Port `session-logger` module from `nbd-plugin.ts` → `plugins/nbd/modules/session-logger.ts`
- [ ] Port `decision-logger` module from `nbd-plugin.ts` → `plugins/nbd/modules/decision-logger.ts`
- [ ] Port `cost-tracker` module from `nbd-plugin.ts` → `plugins/nbd/modules/cost-tracker.ts`
- [ ] Create `plugins/nbd/index.ts` — main plugin entry; imports all modules; exports `satisfies PluginModule`

#### Phase 1D (sequential, after 1C)

- [ ] Add `vitest` + `@types/bun` to `devDependencies` in `package.json`; create `vitest.config.ts`
- [ ] Write unit tests for `lib/paths.ts`, `lib/storage.ts`, `lib/notifier.ts`, `config.ts`
- [ ] Update `opencode.json` plugin entry from `plugins/nbd-plugin.ts` to `plugins/nbd/index.ts`
- [ ] Delete `plugins/nbd-plugin.ts`

---

### Milestone 2: Workflow + Quality Gate Modules [ ]

Implement all workflow automation and quality gate modules.

#### Phase 2A (parallel)

- [ ] `plugins/nbd/modules/auto-stage.ts` — hook `afterFileWrite`; `git add` changed file via `PluginInput.$`
- [ ] `plugins/nbd/modules/session-stats.ts` — hook `afterSession`; write summary to `nbd/sessions/`
- [ ] `plugins/nbd/modules/auto-format.ts` — hook `afterFileWrite`; run formatter based on file extension

#### Phase 2B (parallel, after 2A)

- [ ] `plugins/nbd/modules/branch-guard.ts` — hook `beforeSession`; warn if on protected branch (`main`, `master`)
- [ ] `plugins/nbd/modules/commit-guard.ts` — hook `beforeBash`; intercept `git commit`; run checks
- [ ] `plugins/nbd/modules/undo-stack.ts` — hook `beforeFileWrite`; save unified diff to `nbd/undo.jsonl`

#### Phase 2C (parallel, after 2B)

- [ ] `plugins/nbd/modules/pre-commit-hook.ts` — hook `beforeBash`; intercept `git commit`; run `pre-commit` if installed
- [ ] `plugins/nbd/modules/secret-scanner.ts` — hook `beforeFileWrite`; scan content for secret patterns; block + notify
- [ ] `plugins/nbd/modules/test-on-save.ts` — hook `afterFileWrite`; run related tests for `.test.ts` files
- [ ] `plugins/nbd/modules/lint-on-save.ts` — hook `afterFileWrite`; run `eslint` / `tsc --noEmit` on save

#### Phase 2D (sequential, after 2C)

- [ ] Write unit tests for all Milestone 2 modules
- [ ] Register all Milestone 2 modules in `plugins/nbd/index.ts`

---

### Milestone 3: Custom Tools (15 nbd\_\* tools) [ ]

Implement all 15 custom tools under `nbd_*` namespace.

#### Phase 3A (parallel)

- [ ] `nbd_memory_read` — read `nbd/memory.json`; return structured memory entries
- [ ] `nbd_memory_write` — append entry to `nbd/memory.json`
- [ ] `nbd_log_decision` — append to `nbd/decisions.jsonl`; fields: `decision`, `rationale`, `timestamp`
- [ ] `nbd_recent_files` — read `nbd/recent-files.json`; return list of recently touched files

#### Phase 3B (parallel, after 3A)

- [ ] `nbd_session_summary` — read latest session record from `nbd/sessions/`; return summary
- [ ] `nbd_cost_report` — read `nbd/cost.jsonl`; aggregate by day/session; return report
- [ ] `nbd_undo_last` — read last entry from `nbd/undo.jsonl`; apply reverse patch via `git apply --reverse`
- [ ] `nbd_audit_log` — read `nbd/audit.jsonl`; return last N entries (default 20)

#### Phase 3C (parallel, after 3B)

- [ ] `nbd_notify` — call `notifier.notify(title, body)` via `osascript`
- [ ] `nbd_config_get` — return current resolved `NbdConfig` (merged defaults + `nbd.json`)
- [ ] `nbd_config_set` — write key/value to `nbd.json`; reload config
- [ ] `nbd_module_status` — return enabled/disabled status of all modules

#### Phase 3D (parallel, after 3C)

- [ ] `nbd_slack_notify` — MCP stub: call Slack MCP `send_message`; integration test only
- [ ] `nbd_jira_link` — MCP stub: call Jira MCP `createJiraIssue`; integration test only
- [ ] `nbd_figma_fetch` — MCP stub: call Figma MCP `get_file`; integration test only

#### Phase 3E (sequential, after 3D)

- [ ] Write unit tests for all non-MCP tools (3A–3C)
- [ ] Write integration test stubs for MCP tools (3D)
- [ ] Register all tools in `plugins/nbd/index.ts`

---

### Milestone 4: Context/Memory + Safety/Governance Modules [ ]

#### Phase 4A (parallel)

- [ ] `plugins/nbd/modules/memory-sync.ts` — hook `afterSession`; persist agent memory to `nbd/memory.json`
- [ ] `plugins/nbd/modules/context-injector.ts` — hook `beforePrompt`; inject memory + recent decisions into context
- [ ] `plugins/nbd/modules/audit-logger.ts` — hook `afterBash`; append command + exit code to `nbd/audit.jsonl`

#### Phase 4B (parallel, after 4A)

- [ ] `plugins/nbd/modules/cost-cap.ts` — hook `beforePrompt`; check `nbd/cost.jsonl`; block if over cap; auto-enables `cost-tracker`
- [ ] `plugins/nbd/modules/telemetry.ts` — hook `afterSession`; opt-in; append event to `nbd/telemetry/<YYYY-MM-DD>.jsonl`
- [ ] `plugins/nbd/modules/recent-files-tracker.ts` — hook `afterFileWrite`; update `nbd/recent-files.json`

#### Phase 4C (sequential, after 4B)

- [ ] Write unit tests for all Milestone 4 modules
- [ ] Register all Milestone 4 modules in `plugins/nbd/index.ts`

---

### Milestone 5: TUI/UX + Integration Modules [ ]

#### Phase 5A (parallel)

- [ ] `plugins/nbd/modules/slack-notifier.ts` — hook `afterSession`; MCP stub; call Slack MCP on session end
- [ ] `plugins/nbd/modules/jira-link.ts` — hook `beforeSession`; MCP stub; fetch linked Jira issue context
- [ ] `plugins/nbd/modules/github-pr.ts` — hook `afterSession`; MCP stub; open draft PR if branch has commits
- [ ] `plugins/nbd/modules/figma-fetch.ts` — hook `beforePrompt`; MCP stub; inject Figma frame context

#### Phase 5B (parallel, after 5A)

- [ ] `plugins/nbd/modules/progress-bar.ts` — hook `afterFileWrite`; TUI progress indicator via stdout
- [ ] `plugins/nbd/modules/diff-preview.ts` — hook `beforeFileWrite`; show unified diff before applying
- [ ] `plugins/nbd/modules/compact-mode.ts` — hook `beforePrompt`; trim context if token count near `compaction.reserved`

#### Phase 5C (sequential, after 5B)

- [ ] Write integration test stubs for MCP modules (5A)
- [ ] Write unit tests for non-MCP modules (5B)
- [ ] Register all Milestone 5 modules in `plugins/nbd/index.ts`

---

### Milestone 6: Pack Additions (agents, commands, theme, config fixes) [ ]

#### Phase 6A (parallel)

- [ ] Fix `themes/alpenglow.json`: bump `text2` from `#8E8EA8` to `#A0A0BC`; change `info` token from `indigo` to `sky`
- [ ] Fix `tui.json`: remove trailing comma
- [ ] Rename `commands/interative-review.md` → `commands/interactive-review.md`

#### Phase 6B (parallel, after 6A)

- [ ] Fix `opencode.json`: verify correct agent permission schema against `https://opencode.ai/config.json`; fix `agent.build` and `agent.plan` permission blocks
- [ ] Fix `opencode.json`: remove global bash allow-list entries (`cat`, `grep`, `find`, `head`, `tail`) that conflict with AGENTS.md tool-preference rule
- [ ] Fix `agents/code-reviewer.md`: add scoped bash allow-list (`npx eslint *`, `npx tsc *`, `bun test *`)

#### Phase 6C (parallel, after 6B)

- [ ] Fix `agents/build-parallelizer.md`: deduplicate destructive deny list vs `opencode.json`
- [ ] Create `nbd.json` with default config (all modules enabled, telemetry opt-out, no cost cap)

#### Phase 6D (sequential, after 6C)

- [ ] Smoke-test: load plugin in Bun; verify no import errors; verify `getConfig()` returns defaults

---

### Milestone 7: Docs + Tag v0.1.0 [ ]

#### Phase 7A (parallel)

- [ ] Write `README.md` at repo root: install instructions, module list, config reference, tool list
- [ ] Write `plugins/nbd/README.md`: plugin architecture, module authoring guide, hook reference
- [ ] Write `CHANGELOG.md`: v0.1.0 entry

#### Phase 7B (sequential, after 7A)

- [ ] Final lint + type-check pass
- [ ] Run full test suite
- [ ] Tag `v0.1.0` on current branch

---

## Post-Implementation

1. Run project linter and type-checker
2. Run tests relevant to changed code
3. Invoke `code-reviewer` subagent for full feature diff
4. Address any critical issues from review
5. Display summary of changes

## Test Plan

### Manual Testing

- Load plugin in fresh opencode session; verify no errors in console
- Toggle a module off in `nbd.json`; verify it does not fire
- Trigger `secret-scanner` with a fake AWS key in a file; verify block + notification
- Run `nbd_cost_report` tool; verify output matches `nbd/cost.jsonl`
- Run `nbd_undo_last`; verify file reverts correctly
- Verify `alpenglow.json` contrast: `text2` on `bg0` >= 4.5:1
- Verify `interactive-review.md` command loads without error

### Automated Tests

- Unit: `lib/paths.ts` — all path constants resolve under `~/.config/opencode/`
- Unit: `lib/storage.ts` — JSONL append round-trips correctly
- Unit: `lib/notifier.ts` — `osascript` called with correct args (mock `$`)
- Unit: `config.ts` — defaults applied when `nbd.json` absent; overrides applied when present
- Unit: `secret-scanner.ts` — known patterns (AWS key, GH token) trigger block
- Unit: `undo-stack.ts` — diff saved correctly; `nbd_undo_last` applies reverse patch
- Unit: `cost-cap.ts` — blocks when cost exceeds cap; auto-enables `cost-tracker`
- Integration stubs: `nbd_slack_notify`, `nbd_jira_link`, `nbd_figma_fetch` — verify MCP call shape

### Custom Test Agents

None detected.

---

## Review Findings (Pass 1)

### Critical Issues

| #   | File                         | Line  | Issue                                                                                                |
| --- | ---------------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| C1  | `lib/storage.ts`             | 11–13 | `appendJsonl` read-modify-write race — concurrent appends drop records. Use `fs.appendFile`.         |
| C2  | `modules/secret-scanner.ts`  | 30    | `notify(...)` missing `await` — unhandled promise, notifications silently dropped.                   |
| C3  | `tools/nbd_undo_last.ts`     | 14    | `git checkout` not wrapped in try/catch — raw shell error on untracked/deleted files.                |
| C4  | `modules/pre-commit-hook.ts` | 5     | `HOOK_PATH` resolves to config repo's `.git/hooks`, not project. No project path available from SDK. |
| C5  | `tools/nbd_config_set.ts`    | 23    | `parsed as any` bypasses type validation — caller can corrupt `costCapUsd` with a string.            |

### Improvements

| #   | File                             | Issue                                                                                                      |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| I1  | `index.ts:78`                    | `log_decision` and `nbd_log_decision` are duplicate tools with inconsistent guards. Remove one.            |
| I2  | `modules/cost-cap.ts:27`         | Reads entire `cost.jsonl` on every `message.updated` — O(n) I/O per LLM call.                              |
| I3  | `modules/context-injector.ts:22` | Reads memory + decisions on every user message but only logs to stderr. Rename or implement injection.     |
| I4  | `lib/paths.ts:1`                 | `?? "/root"` fallback silently produces wrong paths. Should throw if `HOME` unset.                         |
| I5  | `modules/undo-stack.ts:14`       | Writes post-edit content but `nbd_undo_last` uses `git checkout`. JSONL data never consumed — incoherent.  |
| I6  | `modules/auto-format.ts:13`      | `lastIndexOf(".")` returns `-1` for extensionless files → `slice(-1)` returns last char. Use `extname`.    |
| I7  | `package.json:4`                 | `node-notifier` and `@types/node-notifier` are dead dependencies.                                          |
| I8  | `modules/memory-sync.ts:13`      | `readJson<object[]>` — `object` too broad. Use named interface or `Record<string, unknown>[]`.             |
| I9  | `tools/nbd_module_status.ts:10`  | Only reports modules in `cfg.modules`. Fresh config returns `{}`. Should enumerate all known module names. |
| I10 | `config.test.ts`                 | Tests re-implement `isModuleEnabled` logic inline instead of importing the actual function.                |
| I11 | `modules/milestone5.test.ts`     | Tests assert on hardcoded string literals, not actual module output. False confidence.                     |
| I12 | `vitest.config.ts:6`             | `exclude: ["node_modules"]` should be `["**/node_modules/**"]`.                                            |

### Nitpicks

| #   | File                           | Issue                                                                                            |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| N1  | `modules/commit-guard.ts:13`   | Registers `file.edited` handler that immediately returns — dead code. Return `{}` from factory.  |
| N2  | `tools/nbd_notify.ts:7` et al. | Raw `{ type: "string" }` schema objects instead of `tool.schema.string().describe(...)` pattern. |
| N3  | `modules/telemetry.ts:18`      | Redundant `mkdir` — `appendJsonl` already calls `ensureDir`.                                     |
| N4  | `modules/session-logger.ts:27` | `filesChanged: []`, `toolCalls: 0`, `totalCostUsd: 0` hardcoded — misleading records.            |
| N5  | `modules/session-stats.ts`     | Local `SessionStats` interface duplicates `SessionRecord`. Use `Pick<SessionRecord, ...>`.       |
| N6  | `lib/notifier.ts:4`            | `JSON.stringify` quoting for AppleScript fragile for backslash sequences.                        |
| N7  | `README.md:28`                 | "commit-guard: Runs tests before git commit" inaccurate — `commit-guard.ts` is a no-op stub.     |
| N8  | `modules/test-on-save.ts:16`   | `result.stdout` written to `stderr` — correct intent but confusing without a comment.            |

## Review Findings (Pass 2 — AI Surface Area Constraints)

Focus: what is currently soft/open-ended that should be hardcoded or constrained in code to minimize AI misuse.

### Critical Issues

| #   | File                                      | Line        | Issue                                                                                                                                                          | Fix                                                                                             |
| --- | ----------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| C-1 | `tools/nbd_undo_last.ts`                  | 14          | `git checkout --` on AI-supplied path with no project-root check. Destructive, no confirmation.                                                                | Resolve path, assert it starts with `process.cwd()`. Add `isModuleEnabled("undo-stack")` guard. |
| C-2 | `modules/cost-cap.ts`                     | 35–40       | `costCapUsd` is advisory-only — fires notification but does not block. Name implies hard enforcement.                                                          | Rename to `costWarnUsd` or document as advisory. If SDK supports session abort, use it.         |
| C-3 | `tools/nbd_memory_write.ts`               | 11–14       | Unbounded disk write — no key allowlist, no value size limit, no entry cap. AI can loop and fill disk.                                                         | Upsert by key, cap at 500 entries, max 4096 bytes per value.                                    |
| C-4 | `lib/notifier.ts` / `tools/nbd_notify.ts` | 4–5 / 10–11 | AI-supplied strings passed to `osascript` with only `JSON.stringify` quoting. No length limit, no control-char strip. No module-enabled guard on `nbd_notify`. | Strip control chars, enforce 200-char limit. Add `isModuleEnabled("notifier")` guard.           |
| C-5 | `modules/auto-stage.ts`                   | 12          | `git add` on any path from event with no project-root check. Could stage files outside project.                                                                | Resolve path, assert within `process.cwd()`.                                                    |

### Improvements

| #   | File                                         | Issue                                                                                                                                         | Fix                                                                                                |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| I-1 | `modules/branch-guard.ts:13`                 | Protected branch list hardcoded to `["main", "master"]`, not configurable. Only checks on `session.created`, not mid-session.                 | Add `protectedBranches: string[]` to `NbdConfig`. Re-check on `file.edited` or bash events.        |
| I-2 | `tools/nbd_config_set.ts:17`                 | Per-key type validation missing — AI can set `costCapUsd` to `"banana"`. `ALLOWED_KEYS` is correct but value types not enforced at runtime.   | Add per-key validators: `costCapUsd` must be positive number or null; `telemetry` must be boolean. |
| I-3 | `tools/nbd_audit_log.ts:13`                  | `limit` parameter has no upper bound — AI can pass `9999999`, reading entire log into memory.                                                 | `Math.min(limit ?? 20, 1000)`.                                                                     |
| I-4 | `modules/secret-scanner.ts:29`               | Detection is post-write — file already saved with secret before notification fires. No tamper-evident record.                                 | Log detection to `audit.jsonl`. Document pre-write blocking is impossible from `file.edited` hook. |
| I-5 | `modules/secret-scanner.ts:5`                | Pattern list missing: Anthropic (`sk-ant-`), Slack (`xoxb-`/`xoxp-`), Stripe (`sk_live_`/`rk_live_`), npm (`npm_`), GCP service account JSON. | Extend `SECRET_PATTERNS` with these patterns.                                                      |
| I-6 | `tools/nbd_module_status.ts:10`              | Iterates `cfg.modules` — returns `{}` on fresh config, misleading AI into thinking no modules are active.                                     | Maintain `KNOWN_MODULES` const array; iterate it instead of `cfg.modules`.                         |
| I-7 | `lib/storage.ts:11`                          | `appendJsonl` reads full file before appending — O(n) per append, race condition on concurrent writes.                                        | Use `fs.appendFile`.                                                                               |
| I-8 | `tools/nbd_config_set.ts:4` / `config.ts:34` | `setConfigKey` is generic over `keyof NbdConfig` including `modules`. Allowlist is the only guard.                                            | Add runtime check in `setConfigKey`: `modules` key must be an object.                              |

### Nitpicks

| #   | File                                       | Issue                                                                                                                |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| N-1 | `index.ts:78,81`                           | `log_decision` and `nbd_log_decision` both registered — duplicate tools, inconsistent guards. Remove `log_decision`. |
| N-2 | `tools/nbd_config_set.ts:10`               | Raw `{ type: "string" }` schema instead of `tool.schema.string()`.                                                   |
| N-3 | `tools/nbd_notify.ts:7`                    | Same raw schema inconsistency.                                                                                       |
| N-4 | `modules/decision-logger.ts:7`             | Exports a tool, not hooks — belongs in `tools/`, already duplicated by `nbd_log_decision.ts`.                        |
| N-5 | `types.ts:38` / `modules/undo-stack.ts:15` | `UndoEntry.content` stored but never read by `nbd_undo_last` (uses `git checkout` instead). Dead data.               |
