---
name: planning
description: Use when working on any task that involves multiple steps or a plan.
---

When working on any task that involves multiple steps or a plan:

1. Optionally use the `parallelize-task` agent (via the Task tool) to
   restructure implementation steps into parallel phases after the
   orchestrator or planner has synthesized the initial approach. The
   orchestrator synthesizes the initial plan directly, without delegation.
   Only delegate to `parallelize-task` when the plan contains independent
   work that materially benefits from parallelization — it is not required
   for every plan.
2. Save the plan output to `.opencode/plans/<descriptive-name>.md` at the start of the task.
3. The plan file must include a progress section listing each task with a status marker:
   - `[ ]` pending
   - `[~]` in progress
   - `[x]` completed
4. Update the plan file after every step — mark the completed step, mark the next step as in progress.
5. Overwrite the same file on each update, do not create new files per update.
6. Include the last updated timestamp at the top of the file on each write.
7. Include numbered external references at the bottom of the plan only when external references are actually used, and cite each reference in line. Local repository paths may be cited directly and do not require a reference entry. A `References` section may be included when a delegated planner requires it or when external references exist; it is not mandatory for local-only plans unless another workflow contract requires it.

Keep plan files concise. Focus on tasks and status, not prose. The concise template below is mandatory for every newly created or materially revised plan.

Orchestrator-specific content must be nested within these sections rather than treated as a competing top-level template. Nest research findings and codebase conventions in `Purpose & context`, `Scope & current behavior`, or `Proposed approach`; nest milestones and implementation steps in `Proposed approach` and `Task progress`; nest post-implementation work in `Validation & extension points`; and nest `parallelize-task` dependency and phase details in `Proposed approach`, `Dependencies, risks & open questions`, or `Task progress` as appropriate. This preserves orchestrator output requirements while keeping this template canonical.

Progress markers may track milestones, phases, or tasks. Use the lowest useful level and keep one authoritative progress list in `## Task progress`.

Existing historical plans do not need migration. All newly created or materially revised plans must follow this template. Do not require `docs/architecture/`, API, or State & stores sections — those details are always folded into the canonical sections above when relevant, never broken out separately.

## Required structure

This structure applies to every plan, regardless of project. Combine sections where content overlaps to keep the plan concise. Ground every section in actual discovered code — real paths, symbols, routes, commands, or entry points. Avoid generic filler. If a section does not apply, write `Not applicable.`

1. `# <Feature or capability name>`
2. `## Purpose & context` — why this work is needed, who/what it affects.
3. `## Scope & current behavior` — what's in/out of scope, how the system behaves today.
4. `## Proposed approach` — the plan of implementation.
5. `## Change footprint`
   - Key files & entry points
   - Touched file areas
   - Approximate lines changed: Added, Modified, Deleted, Total
6. `## Dependencies, risks & open questions`
7. `## Validation & extension points` — how to verify the change and how it can be extended later.
8. `## Task progress` — status-marker task list per rule 3 above.

The plan file path is `.opencode/plans/<name>.md`. Include the last-updated timestamp at the top on every write. Use standard checkbox syntax without a colon: `- [x] task`.

Do not require API or State & stores sections unless the work genuinely touches an API surface or state/store layer — even then, fold that detail into `Proposed approach` or `Change footprint` instead of adding new top-level sections.

Example

```
# Rate-limit login capability

Last updated: <ISO8601 timestamp>

## Purpose & context

Repeated failed logins hit `src/auth/login.ts` `handleLogin()` with no
throttling, allowing brute-force attempts.

## Scope & current behavior

In scope: login handler only. Out of scope: unrelated account flows. Current
handler calls credential verification with no rate limiting.

## Proposed approach

Add a token-bucket check in `handleLogin()` using existing `src/lib/cache.ts`
`getClient()` before calling `verifyCredentials()`. Return 429 on limit hit.

## Change footprint

- Key files & entry points: `src/auth/login.ts`, `src/lib/rateLimiter.ts` (new)
- Touched file areas: auth handler, new rate limiter module, login tests
- Approximate lines changed: Added ~60, Modified ~15, Deleted ~0, Total ~75

## Dependencies, risks & open questions

Depends on `src/lib/cache.ts` being available in all deploy environments.
Risk: shared cache outage disables login entirely if not fail-open. Open
question: what threshold and window to use.

## Validation & extension points

Not applicable for automated tests beyond unit tests on `rateLimiter.ts`;
manually verify 429 after N attempts. Extension point: swap in a different
backing store by implementing the same `RateLimiter` interface.

## Task progress

- [x] implement rate limiter
- [~] wire into login handler
- [ ] add tests
- [ ] manual verification
```

</content>
