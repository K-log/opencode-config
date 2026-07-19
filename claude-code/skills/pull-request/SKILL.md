---
name: pull-request
description: Use when creating, drafting, or opening a pull request. Covers finding the repo's PR template and guidelines, locating the default/base branch, prompting the user when the base branch is unclear, and formatting PR comments to match past project conventions. Triggers on "open a PR", "create a pull request", "draft a PR", "raise a PR".
---

# Pull Request

Workflow for drafting a pull request that matches the repo's conventions and
targets the correct base branch.

## 1. Look up PR template guidelines and examples

Find and follow the repo's existing PR template before writing a description.

Check these locations in order (first match wins):

| Source                   | Path / command                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| GitHub template (single) | `.github/PULL_REQUEST_TEMPLATE.md`, `PULL_REQUEST_TEMPLATE.md`, `docs/PULL_REQUEST_TEMPLATE.md` |
| GitHub templates (multi) | `.github/PULL_REQUEST_TEMPLATE/*.md`                                                            |
| GitLab template          | `.gitlab/merge_request_templates/*.md`                                                          |
| Contributor guidelines   | `CONTRIBUTING.md`, `.github/CONTRIBUTING.md`, `docs/CONTRIBUTING.md`                            |

Steps:

1. Glob for the template paths above. Read the first template found.
2. If multiple templates exist (multi-template dir), use the `AskUserQuestion` tool to
   ask which one applies.
3. Read `CONTRIBUTING.md` for PR rules: required sections, title format, label
   or checklist requirements, linked-issue conventions.
4. For real examples, inspect recent merged PRs to match tone and structure:
   - `gh pr list --state merged --limit 5` then `gh pr view <n>` (if `gh` available)
   - Fall back to `git log --merges -10 --format='%s%n%b'` to read merge bodies.
5. Fill every required section. Do not drop template sections or checklist items.
   Leave a placeholder only when information is genuinely unavailable, and flag
   it to the user.

If no template and no guidelines exist, use a minimal default: title, summary
of changes, testing notes, linked issue.

## 2. Find the default / base branch

Determine the base branch the PR should target. Try in order:

1. Remote HEAD (the repo's real default):
   ```
   git symbolic-ref --short refs/remotes/origin/HEAD
   ```
   If unset, refresh it: `git remote set-head origin --auto` then retry.
2. `gh` (if available): `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`
3. Fallback heuristic: check for `main`, then `master`, then `develop` among
   `git branch -r`.

Do not assume `main`. Repos vary (`master`, `develop`, `trunk`, release branches).

### When the base branch is unclear

If the default cannot be resolved confidently, or multiple plausible bases
exist (e.g. a `develop` + `main` gitflow setup, or the work branched off a
non-default branch), **use the `AskUserQuestion` tool** to ask the user to specify the
base branch. Do not guess.

Provide the detected candidates as options, for example:

- `main` (remote HEAD)
- `develop` (gitflow integration branch)
- the branch the current branch diverged from

Confirm the base before running `gh pr create --base <branch>` or opening the
PR.

## 3. Format PR comments to match past project conventions

Before writing a PR comment (the PR body or a review/discussion comment), study
how the project already writes them and mirror that style.

Gather examples:

1. Recent PR bodies and comments via `gh` (if available):
   - `gh pr list --state merged --limit 10` to find recent PRs
   - `gh pr view <n> --comments` to read the body and full comment thread
   - `gh api repos/:owner/:repo/pulls/<n>/comments` for inline review comments
2. Fall back to merge commit bodies: `git log --merges -15 --format='%b'`.

Infer and match these conventions from the examples:

- **Structure**: section headings, ordering, and which sections are mandatory.
- **Markdown style**: checklists, tables, collapsible `<details>`, code fences.
- **Tone and length**: terse bullet points vs. prose paragraphs.
- **References**: how issues/tickets are linked (`Closes #123`, `Fixes PROJ-1`,
  ticket prefixes), and how reviewers or teams are mentioned.
- **Labels and metadata**: any consistent prefixes, emoji usage, or trailers.

Rules:

- Match the dominant pattern across multiple recent examples, not a single
  outlier.
- If examples conflict or none exist, use the `AskUserQuestion` tool to ask the user
  for the preferred format rather than guessing.
- Keep ticket prefixes consistent with branch/commit conventions (e.g.
  `[PROJ-1234]`).

## Notes

- Never push or open the PR without user confirmation of base branch and body.
- Keep the PR title consistent with commit/branch conventions (ticket prefix if
  the branch name carries one, e.g. `[PROJ-1234]`).
