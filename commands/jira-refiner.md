---
description: Refine Jira epic or ticket alignment, unknowns, dependencies, and update fields with approval.
agent: plan
---

- Input: Jira ticket key/ID as first argument. Never create new tickets.
- Fetch target issue via Jira MCP. Determine issue type.
- If target is an Epic:
  - Fetch child tickets with JQL (`parent = <EPIC-KEY> ORDER BY created ASC`).
  - For each child, validate alignment to epic intent, scope, and acceptance criteria.
- If target is Story/Bug/Task/Sub-task:
  - Fetch parent epic (if present).
  - Fetch siblings in epic (`parent = <EPIC-KEY> AND key != <TARGET-KEY>`).
  - Validate target ticket alignment to parent epic.
  - Validate sibling overlap, contradictions, and scope gaps.
- Build dependency/blocker analysis for every in-scope ticket:
  - Read explicit issue links and classify `blocks`, `is blocked by`, `depends on`, `is depended on by`, `duplicates`, `clones`, `relates`.
  - Flag potential circular dependencies.
  - Flag likely implicit dependencies mentioned in text but not linked.
- Figma design audit:
  - Search ticket descriptions and comments for any Figma links (`figma.com`).
  - If found, fetch each linked Figma file or frame via the Figma MCP.
  - Compare design content (components, flows, labels, states, copy) against the written requirements in the ticket.
  - Flag discrepancies: elements present in the design but absent from requirements, requirements with no corresponding design coverage, and copy/label mismatches.
  - Add Figma discrepancies to the unknowns table with source `Figma` in the `Field` column.
  - If no Figma links are found, note this in the output and continue.
- Produce alignment results and unknowns in markdown tables.
- Required unknowns table columns: `Ticket` | `Field` | `Unknown / Gap` | `Recommendation`.
- Propose refinements for existing tickets only:
  - `Description` (technical implementation notes)
  - `Acceptance Criteria`
  - `Testing criteria / test cases`
  - `Definition of Done`
- Before writing any ticket updates, present proposed edits via `question` tool per ticket.
  - Each question must include:
    - The ticket URL (e.g. `https://<org>.atlassian.net/browse/<TICKET-KEY>`)
    - A diff-style block showing current vs proposed content per field, formatted as:
      ```
      Field: <field name>
      - <removed or replaced lines>
      + <added or appended lines>
      ```
  - Confirmation options per ticket: `Apply`, `Skip`, `Edit manually`, `Re-review`.
  - `Re-review` immediately re-fetches the ticket and restarts the analysis and diff for that ticket only.
- Apply only approved updates using Jira MCP issue edit tools.
- Never remove existing intent. Prefer append or clearly scoped replacement of target sections.
- Final output order:
  - Classification summary
  - Alignment table
  - Figma discrepancy summary (if Figma links were found)
  - Dependency/blocker table
  - Unknowns table
  - Proposed refinements
  - Applied vs skipped changes summary
