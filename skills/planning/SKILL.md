---
name: planning
description: Use when working on any task that involves multiple steps or a plan. 
---

When working on any task that involves multiple steps or a plan:

1. Use the `parallelize-task` agent (via the Task tool) to create or restructure the plan.
2. Save the plan output to `.opencode/plans/<descriptive-name>.md` at the start of the task.
3. The plan file must include a progress section listing each task with a status marker:
   - `[ ]` pending
   - `[~]` in progress
   - `[x]` completed
4. Update the plan file after every step — mark the completed step, mark the next step as in progress.
5. Overwrite the same file on each update, do not create new files per update.
6. Include the last updated timestamp at the top of the file on each write.
7. Include all external references as a number list at the bottom of the plan and cite each reference in line.

Keep plan files concise. Focus on tasks and status, not prose.

Example

```

# <hh:mm dd-MM-yyyy> <Plan title>

<plan description>

<plan details>

Example: Build the project as specified using the required schema from reference [1]

Tasks:

- [x]: completed task A
- [~]: in progress task B (running in parallel with C)
- [~]: in progress task C (running in parallel with B)
- [ ]: pending task D
- [ ]: pending task E


References:

[1]: https://link-to-reference.com/
[2]: https://link-to-reference.com/other-reference-path

```
