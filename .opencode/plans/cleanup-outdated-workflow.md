# Cleanup outdated tier workflow

Last updated: 2026-07-14T23:55:00Z

## Purpose & context

Remove outdated tier-based build workflow files (assistant-to-the-manager /
build-cheap / build-mid / build-powerful / parallelize-build / model-tiers
skill / auto-models / update-model-tiers commands / orphaned model-tiers.json
cache) and replace the tiered orchestration pattern with a single generic
implementation sub-agent workflow. Generalize `parallelize-task.md` to drop
tier-tag/tier-agent assumptions while keeping its general parallel planning
utility. Rewrite `orchestrate.md` so the workflow is fully operational after
cleanup, with orchestrator-driven review and bounded retry in place of tier
selection. Preserve current branch (`main`). Automated validation required
after cleanup.

## Scope & current behavior

Target files confirmed present on disk (research complete):

- `agents/assistant-to-the-manager.md`
- `agents/build-cheap.md`
- `agents/build-mid.md`
- `agents/build-powerful.md`
- `agents/parallelize-build.md`
- `skills/model-tiers/SKILL.md`
- `commands/auto-models.md`
- `commands/update-model-tiers.md`
- `cache/model-tiers.json` (orphaned cache artifact, only consumer is the
  tier workflow being removed)

Retained but generalized: `agents/parallelize-task.md` (110 lines) — grep
confirms it carries no tier-tag/tier-agent references itself, but its role
in the workflow (used alongside `parallelize-build`) needs re-documenting to
stand alone as a general parallel-planning agent.

Rewritten: `agents/orchestrate.md` (555 lines) — confirmed via grep to
contain 12 lines referencing removed artifacts (`parallelize-build`,
`model-tiers` skill/cache, `build-mid` default, `assistant-to-the-manager`
context), spanning the Phase 1 model-selection toggle, Phase 4 tagging
logic, Phase 5c/6 fix-loop delegation, and the subagent list callout.

Decision: `agent.build` in `opencode.json` carries a minimal mode-only
override (`"mode": "all"`) to expose OpenCode's built-in `build` agent to
subagent delegation from `orchestrate.md`. This is a mode-only override,
not a historical/behavioral claim — no model, prompt, permission, or
options fields are set, so all built-in defaults for the `build` agent are
preserved. No `agents/build.md` file exists.

No other files in `agents/`, `skills/`, `commands/`, or `opencode.json*`
reference the target artifacts (full-tree grep confirmed).

## Proposed approach

### Milestone 1: Cleanup & generalization

**Phase 1 (parallel, no mutual dependencies):**

- Delete `agents/assistant-to-the-manager.md`
- Delete `agents/build-cheap.md`
- Delete `agents/build-mid.md`
- Delete `agents/build-powerful.md`
- Delete `agents/parallelize-build.md`
- Delete `skills/model-tiers/SKILL.md` (and directory if left empty)
- Delete `commands/auto-models.md`
- Delete `commands/update-model-tiers.md`
- Delete `cache/model-tiers.json`
- Generalize `agents/parallelize-task.md` to remove tier-tag/tier-agent
  assumptions while preserving its general parallel planning utility

Dependencies: none between the above tasks (independent files); all must
complete before Milestone 2 starts (orchestrator rewrite assumes the tier
artifacts are already gone).

### Milestone 2: Orchestrator rewrite (depends on Milestone 1)

**Phase 2 (single task, no internal parallel split — one file):**

- Rewrite `agents/orchestrate.md` for a single generic build sub-agent
  (built-in `build` agent): orchestrator selects it, reviews its output each
  invocation, and on unsatisfactory output dispatches a new sub-agent
  instance with updated instructions, bounded by a retry limit. Preserve
  research, analysis, canonical plan handling, same-session change
  handling, validation delegation, regression blocking, commit
  confirmation, current-branch constraint, and no-direct-edit rules.

Dependencies: requires Milestone 1 complete (removed-artifact references
must no longer exist before the replacement logic is written).

### Milestone 3: Deep review (depends on Milestone 2)

**Phase 3 (single task, sequential review pass):**

- Deep review all updated agents/skills and cross-check against initial
  analysis findings; fix any confirmed issues (model selection replacement,
  review/retry adjudication limits, validation permission alignment,
  canonical plan concision, same-session amendment safety, plan ownership
  protection, commit contract consistency).

Dependencies: requires Milestone 2 complete (nothing to review until the
rewrite exists).

### Milestone 4: Validation (depends on Milestone 3)

**Phase 4 (parallel):**

- Full-tree grep for removed filenames/tier-related terms across
  `agents/`, `skills/`, `commands/`, `cache/`, and `opencode.json*`
- Confirm `opencode.json` still parses/validates and `orchestrate.md`
  correctly targets the built-in `build` agent via the local mode-only
  `agent.build` override (`"mode": "all"`), with no local `agents/build.md`
  file, model/prompt/permission override, or custom agent

**Phase 4b (after Phase 4, single task):**

- Record exact validation command output (grep results, config parse
  result) in this plan

Dependencies: requires Milestone 3 complete. Validation commands are
selected by delegated validation agents at execution time, not fixed here;
exact outcomes must be recorded verbatim once run.

## Change footprint

Key areas touched: `opencode.json` (local mode-only `agent.build` override),
`agents/orchestrate.md`, `agents/review-code.md`, `agents/check-regressions.md`,
`agents/parallelize-task.md`, `commands/git-commit.md`. Deleted tier
artifacts (`agents/assistant-to-the-manager.md`, `agents/build-cheap.md`,
`agents/build-mid.md`, `agents/build-powerful.md`,
`agents/parallelize-build.md`, `skills/model-tiers/SKILL.md`,
`commands/auto-models.md`, `commands/update-model-tiers.md`,
`cache/model-tiers.json`) remain deleted and are not restored.

Approximate lines: Added ~682, Modified 8 files, Deleted ~814, Total ~1,496
lines across 18 paths (17 tracked paths plus the untracked canonical plan
file).

## Dependencies, risks & open questions

- Resolved: `agent.build` in `opencode.json` carries a minimal mode-only
  override (`"mode": "all"`, no model/prompt/permission/options) that exposes
  OpenCode's built-in `build` agent to subagent delegation; no
  `agents/build.md` file created and no built-in defaults overridden beyond
  visibility.
- Risk: rewritten `orchestrate.md` must fully replace tier-based model
  selection logic with a single generic-agent path without leaving a
  half-migrated hybrid (e.g. stale references to "default tier" or
  "untagged" language).
- Risk: review/retry loop needs an explicit adjudication rule (what counts
  as "unsatisfactory") and a final bounded retry limit to avoid infinite
  loops; must be resolved during the orchestrate.md rewrite, not left
  implicit.
- Risk: validation-agent permissions/tooling referenced in `orchestrate.md`
  must stay aligned with `opencode.json` permission blocks (e.g. `build`
  agent's `rm*`/`git push --force*` denials) after rewrite.
- Risk: canonical plan concision and progress-tracking conventions (as used
  in this very plan file) must be preserved in the rewritten orchestrator
  instructions, not regressed.
- Risk: same-session plan amendments must remain safe (single source of
  truth, no conflicting concurrent edits) under the new single-agent
  review/retry model.
- Risk: plan ownership (only orchestrator edits canonical plan, sub-agent
  never edits it directly) must be explicitly preserved in the rewrite.
- Risk: commit-confirmation contract (explicit user confirmation before
  commit, branch preservation) must remain consistent with global git rules.
- Constraint: preserve current branch (`main`); no branch creation/switch.
- Constraint: do not delete/modify target files until plan is reviewed and
  approved by user.
- Open question (deferred, not in this cleanup's scope): initial-analysis
  recommendations for session-review, translation-audit, and telemetry
  tooling remain future work and are explicitly out of scope here.
- Resolved: review/retry loop uses a bounded retry limit of 3 for
  unsatisfactory build output or review cycles. "Unsatisfactory" means any
  of: incomplete task, missing requested verification, unresolved blocker,
  or output contradicted by review/regression evidence.
- Resolved: Milestone 4 validation commands are selected by the delegated
  validation agent(s) at execution time (not fixed in advance in this
  plan); exact outcomes must be recorded verbatim in this plan once run.
- Resolved: Milestone 1 review found `agents/parallelize-task.md` frontmatter
  used the unsupported `permissions:` key instead of the repository-supported
  `permission:` key. Fixed by renaming the key in place, preserving the
  existing `read: true` / `websearch: true` values and all other content.
- Resolved: follow-up review found the `permission:` block in
  `agents/parallelize-task.md` still used unsupported boolean values
  (`read: true`, `websearch: true`) instead of the repository's
  `allow`/`deny`/`ask` convention (confirmed via cross-check of other
  `agents/*.md` frontmatter). Fixed by changing both values to `allow`,
  with no other content changed.
- Resolved: Milestone 2 confirmed `opencode.json` defines a built-in
  `agent.build` entry (mode-only override, no model override); the
  rewritten `orchestrate.md` targets it directly as the sole generic
  implementation sub-agent and states the fallback is simply the runtime
  default model, avoiding any dynamic tier-routing claims.
- Accepted constraint: canonical plan protection for the built-in `build`
  agent is instruction-level only (`orchestrate.md` tells `build` it must
  never edit `.opencode/plans/<identifier-or-slug>.md`). The user chose not
  to add a permission override or a custom `agents/build.md` file, so there
  is no filesystem-enforced guarantee preventing `build` from writing to the
  plan file. This is an accepted risk of the chosen design, not a resolved
  or enforced constraint.
- Open item (deferred to Milestone 3): deep review of the Milestone 2
  rewrite against the original tier-workflow contract (review/retry
  adjudication limits, validation permission alignment, canonical plan
  concision, same-session amendment safety, plan ownership protection,
  commit contract consistency) has not yet been performed. No blockers
  identified during the rewrite itself.
- Resolved (Milestone 3, cumulative current state): deep review found and
  fixed the following defects across `opencode.json`, `orchestrate.md`,
  `review-code.md`, `check-regressions.md`, `parallelize-task.md`, and
  `commands/git-commit.md`: `agent.build` mode-only override (`"mode":
"all"`, no model/prompt/permission/options fields) added and confirmed
  in place, with bash deny patterns ordered after the wildcard allow;
  `orchestrate.md` plan-edit permission wording corrected (no longer
  overstates "no edit permissions" when `.opencode/plans/*.md` is allowed)
  and no longer implies a build-model fallback to a different configured
  model (now states runtime default); Phase 1 test opt-in scoped to all
  milestone `check-regressions` calls, not just Phase 6; review/regression
  findings now use an evidence/adjudication rule distinguishing confirmed
  vs. potential issues; final review uses a recorded task baseline instead
  of an empty/working-tree `git diff HEAD`; final-validation corrective
  retries have a bounded attempt limit and commit-confirmation step
  (mirrors 5c); commit command examples include `AI_TOOL=opencode`;
  `review-code.md` bash deny/allow ordering fixed (wildcard deny first),
  scoped to permitted-checks-only (no arbitrary project tooling claim), and
  granted read-only Git inspection commands (`git status*`, `git diff*`,
  `git show*`, `git log*`, `git merge-base*`, `git rev-parse*`,
  `git branch*`) with `edit: deny` unchanged, so it can inspect a
  caller-supplied baseline; `check-regressions.md` has a project-agnostic
  read-only permission block (test commands set to `ask`), accepts a
  caller-supplied baseline and respects opt-in instead of always defaulting
  to `git diff HEAD` and always running tests, and its report format
  distinguishes confirmed vs. potential regressions and test/tool failures;
  `parallelize-task.md` clarified to never create or edit plan files
  (returns the completed plan in its report to the invoking agent instead
  of proposing it directly to the user), with `References` and
  directory-diagram sections made conditional; explicit staging ownership
  added to Phase 5d (`build` subagent stages only reviewed intended files
  and reports the staged diff/stat before `/git-commit` runs its own
  confirmation; orchestrator never stages); Phase 5b/6 wording corrected so
  `review-code` and `check-regressions` always receive an explicit baseline
  commit/range and changed-file context; Phase 6 linter/type-checker
  delegation corrected so `review-code` runs only its explicitly permitted
  checks, treating an unpermitted required command as unavailable
  validation recorded via the `question` tool; `commands/git-commit.md`'s
  optional two-line description reconciled with a single command form
  (second `-m` flag specified explicitly).

## Validation & extension points

- After cleanup, grep entire `agents/`, `skills/`, `commands/`, `cache/`
  trees and `opencode.json*` for removed filenames and tier-related terms
  (`build-cheap`, `build-mid`, `build-powerful`, `parallelize-build`,
  `assistant-to-the-manager`, `model-tiers`, `auto-models`,
  `update-model-tiers`) to confirm zero dangling references.
- Confirm `opencode.json` still parses/validates and `orchestrate.md`
  correctly delegates to the built-in `build` agent per the accepted design:
  a local mode-only `agent.build` override (`"mode": "all"`, no model,
  prompt, or permission fields) in `opencode.json`, and no local
  `agents/build.md` file. This mode-only override is intentional and
  expected, not a gap.
- Final validation outcomes (Milestone 4, this pass):
  - `git diff HEAD --check`: PASS
  - `opencode debug config`: PASS
  - `opencode debug agent build`: PASS; native built-in `build` agent
    resolves mode `all`
  - `opencode agent list`: PASS; `build (all)` present
  - No custom build-agent file checks: PASS (no `agents/build.md` exists)
  - Active-tree removed-artifact scan (excluding this canonical plan): PASS;
    zero matches
  - Active-tree generic tier-term scan (excluding this canonical plan): PASS;
    zero matches
  - Frontmatter permission validation for `orchestrate.md`, `review-code.md`,
    `check-regressions.md`, `parallelize-task.md`: PASS
  - `jq` strict JSON parse check on `opencode.json`: unavailable/fails due to
    an existing JSONC trailing comma; OpenCode's own config validation
    (`opencode debug config`) is authoritative here and passed
- Future recommendation (explicitly out of scope for this cleanup): revisit
  initial-analysis suggestions for session-review, translation-audit, and
  telemetry once the generic single-agent workflow has run in practice.

- Resolved (this edit, Milestone 3 continued): reviewed `agents/orchestrate.md`
  for residual generic tier terminology (`tier assumptions`, `dynamic
model-tier`, `per-tier routing`) and replaced it with neutral wording — no
  dynamic model routing, no role-specific routing, `parallelize-task` used
  only when independent work materially benefits from parallelization.
  Aligned `skills/planning/SKILL.md` and `skills/building/SKILL.md` with
  this policy: `parallelize-task` is optional after an initial
  approach/plan exists and is not required for every plan/build; the build
  workflow uses one built-in `build` delegation per implementation attempt
  with orchestrator-owned review/retry, with no tier agents or custom build
  files introduced. Milestone 4 validation (full-tree grep, config parse
  check) has not yet been run for this pass.

- Resolved (Milestone 3, final confirmed fixes, this edit): `parallelize-task.md`
  wording changed from claiming it "create[s] and edit[s] plans" to stating
  it produces a proposed parallel plan restructuring/report only and never
  creates or edits plan files, all other duties preserved; `skills/building/SKILL.md`
  residual `tier agents` wording replaced with neutral `alternate
implementation agents`, no-custom-build-files policy retained;
  `orchestrate.md` 5d wording changed from "5b passes clean" to "output is
  satisfactory and no blocking findings remain", so non-blocking
  improvements/nitpicks/coverage gaps remain skippable by documented
  adjudication rather than implying a strict clean-pass gate; `review-code.md`
  example Task identifiers corrected from `review-code.agent` to
  `review-code`, matching the actual agent name used elsewhere in the file.
- Resolved (initial-findings comparison, Milestone 4): duplicate tier
  workflow, single-build delegation, retry bounding, validation-permission,
  and canonical-plan-concision findings from initial analysis are all
  resolved in the final state. Deferred (out of scope, unchanged):
  session-review, translation-audit, telemetry tooling. Accepted: canonical
  plan protection for the `build` agent remains instruction-only, not
  filesystem-enforced.

- Resolved (final wording correction, this edit): `parallelize-task.md`
  line 111 "When editing an existing plan" changed to "When restructuring
  an existing plan" so the before/after-diff guidance never implies
  plan-file edits, consistent with its documented never-edits-plan-files
  duty above. No other content changed.

## Task progress

- [x] Requirements
- [x] Research
- [x] Analysis
- [x] Plan synthesis
- [x] Parallelization
- [x] Milestone 1: Cleanup & generalization
- [x] Milestone 2: Orchestrator rewrite
- [x] Milestone 3: Deep review
- [x] Milestone 4: Validation
