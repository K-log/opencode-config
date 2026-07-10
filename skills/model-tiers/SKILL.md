---
name: model-tiers
description: >-
  Use when the orchestrator agent delegates implementation work and needs to
  pick a cost tier (cheap/mid/powerful) for each task before dispatching to
  parallelize-build.
---

## Model Tiers

Three fixed implementation subagents back three cost tiers:

| Tier     | Subagent         | Typical use                                                                               |
| -------- | ---------------- | ----------------------------------------------------------------------------------------- |
| cheap    | `build-cheap`    | Boilerplate, renames, config/doc edits, simple CRUD following an existing pattern         |
| mid      | `build-mid`      | Typical feature work, standard business logic (default when unsure)                       |
| powerful | `build-powerful` | Complex algorithms, security/auth, architecture decisions, ambiguous or high-risk changes |

The actual model behind each tier is pinned in that subagent's own frontmatter
(`model:` field) and is **not** looked up live during a session. It is set by
the `/update-model-tiers` command, which must be run manually.

### Whether tiering runs at all

This skill only applies when dynamic model selection is turned on. The
orchestrator checks `~/.config/opencode/cache/auto-models.json` before
touching this skill:

- Default is **off**: if the file is missing or `enabled` is `false`, the
  orchestrator never loads this skill and never reads `model-tiers.json`.
- Only when `enabled` is `true` does the orchestrator load this skill and tag
  steps per the classification rules below.
- Toggle it with `/auto-models enable|disable`. Never toggle it yourself.
- When off, do not classify tasks — the orchestrator leaves steps untagged
  and `parallelize-build` runs everything on `build-mid`.

### Reading the current mapping

The cache file lives at `~/.config/opencode/cache/model-tiers.json`. Read it
directly (via the Read tool) to see which concrete models are currently behind
each tier, for display/transparency purposes only — do not use its contents to
decide tiers dynamically, and never attempt to refresh it yourself.

If the file is missing or unreadable:

- Do not attempt to generate or refresh it.
- Tell the user once that tiering data is unavailable and recommend running
  `/update-model-tiers`.
- Treat every task as `mid` tier for the rest of the session.

### Classifying a task

When synthesizing implementation steps, tag each one with `[tier: cheap]`,
`[tier: mid]`, or `[tier: powerful]`:

- **cheap** — mechanical, low-ambiguity, low-risk. Boilerplate, straightforward
  renames/refactors, config or documentation edits, CRUD that copies an
  existing pattern exactly.
- **mid** — the default. Standard feature implementation, typical business
  logic, moderate integration work. Use this when a task doesn't clearly fit
  cheap or powerful.
- **powerful** — complex algorithms, security/auth-sensitive code, data
  integrity-critical paths, architecture or design decisions, or anything
  ambiguous enough that a wrong guess would be costly.

### Escalation

If a `build-cheap` or `build-mid` task reports a blocker requesting
escalation, the next tier up should retry the task once before it is surfaced
back to the orchestrator as unresolved.
