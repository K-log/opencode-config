---
description: Generate a daily standup update from Jira and/or git activity.
---

1. Use the `AskUserQuestion` tool with multiple-choice multi-select to ask which evidence sources to include: `Jira`, `Git`, `Other`.

2. Use the `AskUserQuestion` tool to collect (via its free-text "Other" input if needed):
   - Jira display name (used in JQL `assignee` filter)
   - Git author name (used in `git log --author` filter)

3. (Git only) Use the `AskUserQuestion` tool to ask for one or more repo paths (local filesystem paths or remote git URLs), comma-separated. Suggest the current working directory as the default.

4. Run `date +%u` to get the current day of week (1=Monday … 7=Sunday). If today is Monday (1), last working day = last Friday; otherwise last working day = yesterday. Format both last working day and today as `YYYY-MM-DD`.

5. (Jira only) Discover in-progress statuses:
   - Run a broad JQL query with no status filter: `assignee = "<JIRA_NAME>" ORDER BY updated DESC` with a limit of 50 results.
   - Extract all unique status names from the returned issues.
   - Classify each status into one of three buckets using judgment. Examples to guide classification:
     - **Done/terminal** (exclude): Done, Deployed, Released, Closed, Resolved, Cancelled, Complete, Won't Do, Rejected
     - **Pre-work/not started** (exclude): Backlog, To Do, Open, Design, New, Ready, Triage, Discovery, Waiting, Icebox
     - **Blocked/on hold** (exclude): Blocked, On Hold, Needs Clarification, Needs Design, Pending
   - For any status not covered by these examples, use judgment to classify it based on whether it represents active work in flight. When ambiguous, treat it as in-progress.
   - The remaining statuses after exclusion are treated as in-progress. Use them in step 6's second JQL query.

6. (Jira only) Run two JQL queries via Jira MCP tools:
   - `assignee = "<JIRA_NAME>" AND updated >= "LAST_WD" ORDER BY updated DESC` — issues active on last working day
   - `assignee = "<JIRA_NAME>" AND status in ("<STATUS_1>", "<STATUS_2>", ...) ORDER BY updated DESC` — use the in-progress statuses discovered in step 5
     For each ticket, fetch issue links and identify any `is blocked by` relationships or tickets in a Blocked/Impediment status.

7. (Git only) For each repo path from step 3, run two `git log` commands:
   - `git -C "<PATH>" log --oneline --since="LAST_WD 00:00" --until="LAST_WD 23:59" --author="<GIT_NAME>"` — commits from last working day
   - `git -C "<PATH>" log --oneline --since="TODAY 00:00" --author="<GIT_NAME>"` — commits already today

8. Classify all fetched data:
   - **Yesterday**: Jira tickets updated on last working day + git commits from last working day
   - **Today**: Jira tickets currently In Progress + git commits already today
   - **Blockers**: tickets with `is blocked by` issue links or Blocked/Impediment status
   - **Other**: if Other was selected in step 1, use the `AskUserQuestion` tool to ask the user to type any additional free-text items

9. Print the standup in this exact format:

   ```
   **Yesterday**
   - [PROJ-123] Summary (Done) — https://...atlassian.net/browse/PROJ-123
   - git: abc1234 "commit message" (repo-name)

   **Today**
   - [PROJ-456] Summary (In Progress) — https://...

   **Blockers**
   - [PROJ-789] Summary — blocked by PROJ-001

   **Other**
   - <user-supplied items, omit section if Other not selected or no items>
   ```

   Omit any section with no entries except Yesterday and Today (always show those even if empty).

10. After the formatted block, write 2–3 sentences in natural language synthesizing the update: themes of what was accomplished yesterday (not per-ticket enumeration), focus for today, and blockers or confirmation of none.
