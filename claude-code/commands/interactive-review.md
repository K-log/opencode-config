---
description: Perform a full in-depth review then present all findings and their fixes for approval.
---

- Perform a thorough code review and present any notable findings to the user.
- Present the findings as a markdown table with the columns: `severity`, `description`, `relevant files`, `supporting documentation (links)`. Return this to the user before the question step.
- Finally, using the `AskUserQuestion` tool, present each finding row formatted as a single question. Each question should have 4 options for resolution for the user to pick from.
