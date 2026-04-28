---
name: code-quality
description: Code quality and refactoring standards: comments, types, debug hygiene, and when to refactor.
---

## Code Quality

- Never add redundant comments. Only comment complex or non-obvious logic.
- Never add documentation overhead unless creating public APIs.
- Never use debug print/log statements in production code.
- Never bypass the type system (`any`, `dynamic`, `object`, etc.) when strict types are available.
- Use explicit types for public interfaces. Make function signatures self-documenting.

## Refactoring

Only refactor proactively when:

- The same logic appears 3+ times in related files.
- Type safety gaps exist in files you are already modifying.
- There is an obvious performance bottleneck.
- There is clearly dead code in files you are already modifying.

Never refactor:

- Working code in files you are not modifying.
- Code using older patterns that works correctly.
- Code that could be "more elegant" but is readable.
