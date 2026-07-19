---
name: building
description: Use when starting to build out a plan or requested change.
---

When building out a plan, follow these core principles:

1. An initial approach/plan must already exist before building. Optionally
   use the `parallelize-task` agent (via the Task tool) to restructure the
   plan into parallel phases, but only when independent work materially
   benefits from parallelization. This is not required for every build.
2. Use one `general-purpose` subagent delegation per implementation attempt.
   When the orchestrator workflow (`/orchestrate`) is active, it owns review
   of the build output and any retry; do not introduce alternate
   implementation agents or custom build files.
3. Utilize the `AskUserQuestion` tool for anything unclear or any unexpected situations. Do not deviate from the plan without confirmation.
4. Always avoid unrelated changes. Stay focused on the current task and what the plan dictates.
