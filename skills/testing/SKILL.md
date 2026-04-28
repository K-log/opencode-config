---
name: testing
description: Testing standards: what to test, what to skip, and how to write good tests.
---

## Testing

Test: business logic, complex utilities, validation/transformation logic, error handling at boundaries.

Do not test: simple presentational logic, third-party behavior, auto-generated code, trivial getters/setters.

- Test public interfaces and behavior, not internal state or implementation details.
- Mock external dependencies, not internal modules.
- Write descriptive test names that document intent.
- Assume users are hostile and should not be trusted when writing test criteria.
