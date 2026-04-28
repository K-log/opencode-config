---
name: typescript
description: TypeScript and JavaScript coding standards: ES6+ syntax, strict typing, package manager selection, and test tooling (Vitest, Playwright).
---

## TypeScript / JavaScript

- Use TypeScript for all new code. Use ES6+ syntax.
- Use the correct package manager for the project (check for a lock file or `package.json`).
- Avoid `any` or `unknown` unless absolutely necessary.
- Write unit and integration tests with Vitest.
- Write browser and end-to-end tests with Playwright.
- Do not use Playwright for unit tests; do not use Vitest for browser or E2E tests.
