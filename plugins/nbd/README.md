# NBD Plugin — Architecture Guide

## Structure

```
plugins/nbd/
  index.ts          — main entry, registers all modules and tools
  config.ts         — reads nbd.json, exports getConfig() / isModuleEnabled()
  types.ts          — shared TypeScript types
  lib/
    paths.ts        — canonical path constants
    storage.ts      — JSONL/JSON read-write helpers
    notifier.ts     — osascript notification wrapper
  modules/          — one file per module, exports a hooks factory function
  tools/            — one file per tool, exports a tool definition object
```

## Adding a Module

1. Create `modules/my-module.ts`:

```ts
import type { Hooks } from "@opencode-ai/plugin";
import { isModuleEnabled } from "../config";

export function myModuleHooks(): Partial<Hooks> {
  return {
    event(event) {
      if (!isModuleEnabled("my-module")) return;
      if (event.type === "file.edited") {
        // your logic
      }
    },
  };
}
```

2. Import and register in `index.ts`.

## Adding a Tool

1. Create `tools/nbd_my_tool.ts` following the shape of existing tools.
2. Import and add to the `tool` map in `index.ts`.

## SDK Hook Events (confirmed in use)

| Event             | Fires when                                     |
| ----------------- | ---------------------------------------------- |
| `session.created` | New session starts                             |
| `session.idle`    | Session ends / goes idle                       |
| `file.edited`     | A file is written by the agent                 |
| `message.updated` | A message is added/updated in the conversation |

## State Directory

All state lives under `~/.config/opencode/nbd/`:

| Path                | Contents                       |
| ------------------- | ------------------------------ |
| `sessions/`         | Per-session JSON records       |
| `memory.json`       | Agent memory entries           |
| `decisions.jsonl`   | Decision log                   |
| `undo.jsonl`        | Undo stack entries             |
| `audit.jsonl`       | File edit audit log            |
| `recent-files.json` | Recently touched files         |
| `cost.jsonl`        | Cost records per LLM response  |
| `telemetry/`        | Opt-in telemetry JSONL by date |
