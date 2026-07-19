---
name: testing
description: Testing standards. What to test, what to skip, and how to write good tests.
---

## Testing

Test: business logic, complex utilities, validation/transformation logic, error handling at boundaries.

Do not test: simple presentational logic, third-party behavior, auto-generated code, trivial getters/setters.

- Test public interfaces and behavior, not internal state or implementation details.
- Mock external dependencies, not internal modules.
- Write descriptive test names that document intent.
- Assume users are hostile and should not be trusted when writing test criteria.

## Playwright Browser Tools

Browser-evaluate style tools (e.g. Playwright MCP `browser_evaluate` / `browser_run_code`) execute JavaScript in a **browser page sandbox**. They are NOT a Node.js runtime.

- Never use `require()`, `import()`, `process`, `fs`, `child_process`, `execSync`, or any Node.js API inside these tools.
- Only browser globals are available: `document`, `window`, `navigator`, `fetch`, `localStorage`, etc.
- Use these tools only to read or manipulate the DOM or call browser APIs.
- For shell commands, git, or file system access: use bash.
- Do not use any Playwright browser tool for tasks that do not require a rendered browser page.
