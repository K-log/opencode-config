---
name: react
description: React coding standards: prefer functional components and hooks, strongly type all props and state.
---

## React

- Prefer functional React components and hooks over class components.
- Ensure all props and state are strongly typed.
- Prefer event-driven logic over reactive patterns. Trigger side effects and state updates directly from event handlers rather than using `useEffect` to watch for state changes.
- Prefer global state in the URL.
- Creation of Context is rarely needed. Prefer URL state, useState, an available state library such as zustand or redux before choosing context.
  - Context can poorly affect performance when incorrectly setup.

## Reference

- [React Documentation](https://react.dev) — use for latest / unspecified versions
- [React 18 Docs](https://18.react.dev/)
- [React 17 Docs](https://17.react.dev/)
- [React 16 Docs](https://16.react.dev/)

> If a specific React version is known, use the matching versioned docs above. Otherwise, default to react.dev.
