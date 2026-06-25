---
name: create-opencode-plugin
description: Use when creating, editing, or debugging an opencode plugin. Covers auto-discovery, export shapes, all hook types, event types, the tool() helper, cross-platform shell usage, and local vs npm plugin registration. Front-load keywords: plugin, hooks, event, tool, session, notification, opencode plugin.
---

# create-opencode-plugin

Complete reference for building opencode plugins. Sourced from the opencode GitHub repo (`sst/opencode`, branch `dev`) and official docs at https://opencode.ai/docs/plugins.

---

## Auto-discovery (no opencode.json entry needed)

opencode scans these glob patterns on every startup:

| Scope   | Paths                                                                            |
| ------- | -------------------------------------------------------------------------------- |
| Global  | `~/.config/opencode/plugin/*.{ts,js}` and `~/.config/opencode/plugins/*.{ts,js}` |
| Project | `.opencode/plugin/*.{ts,js}` and `.opencode/plugins/*.{ts,js}`                   |

Drop a `.ts` or `.js` file into either `plugin/` or `plugins/` subdirectory — opencode picks it up automatically. No config change needed.

Bun runs `.ts` files natively. No compilation step.

---

## Load order (highest to lowest priority)

1. Global `opencode.json` plugin array
2. Project `opencode.json` plugin array
3. Global plugin dirs (`~/.config/opencode/plugin/` and `plugins/`)
4. Project plugin dirs (`.opencode/plugin/` and `plugins/`)

Duplicate npm packages (same name+version) → loaded once.

---

## Export shapes

### Local file (auto-discovered or referenced via path in opencode.json)

Named export — simplest, recommended for local files:

```ts
import type { Plugin } from "@opencode-ai/plugin";

export const MyPlugin: Plugin = async ({
  project,
  client,
  $,
  directory,
  worktree,
  serverUrl,
  experimental_workspace,
}) => {
  return {
    // hooks
  };
};
```

No default export required. Any named export of type `Plugin` is picked up.

### npm package (or local with explicit id)

Must use `PluginModule` default export:

```ts
import type { Plugin } from "@opencode-ai/plugin";

const MyPlugin: Plugin = async (input, options) => ({
  // hooks
});

export default {
  id: "my-plugin", // required for npm packages
  server: MyPlugin,
};
```

> **Note:** `PluginModule` with `{ id, server }` is internal API sourced from the opencode source code (`packages/plugin/src/index.ts`). The public docs do not document it. For npm packages, prefer testing with the named export shape first.

---

## Registering in opencode.json (when not using auto-discovery)

```json
{
  "plugin": [
    "./plugins/my-plugin.ts",
    "/abs/path/to/plugin.ts",
    "file:///abs/path/to/plugin.ts",
    "opencode-some-npm-package",
    "opencode-pinned@1.2.3",
    ["opencode-with-options", { "apiKey": "..." }]
  ]
}
```

Relative paths resolve relative to the config file that declares them (not `cwd`).

---

## PluginInput — what the plugin function receives

```ts
type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>; // opencode REST client
  project: Project; // project metadata
  directory: string; // active working directory
  worktree: string; // git worktree root
  experimental_workspace: {
    register(type: string, adapter: WorkspaceAdapter): void;
  };
  serverUrl: URL; // opencode server URL
  $: BunShell; // Bun shell for running commands
};
```

`$` is Bun's shell — use as a tagged template: `` await $`notify-send "Title" "Message"` ``

---

## Complete Hooks interface

All hooks are optional. Return an object with only the hooks you need.

```ts
interface Hooks {
  // Called for every bus event
  event?: (input: { event: Event }) => Promise<void>;

  // Called once on init with the merged config — mutate fields here
  config?: (input: Config) => Promise<void>;

  // Register custom tools — key is the tool name
  tool?: { [key: string]: ToolDefinition };

  // Custom auth provider
  auth?: AuthHook;

  // Custom model list
  provider?: ProviderHook;

  // Intercept incoming messages
  "chat.message"?: (
    input: {
      sessionID: string;
      agent?: string;
      model?: { providerID: string; modelID: string };
      messageID?: string;
      variant?: string;
    },
    output: { message: UserMessage; parts: Part[] },
  ) => Promise<void>;

  // Modify LLM call parameters
  "chat.params"?: (
    input: {
      sessionID: string;
      agent: string;
      model: Model;
      provider: ProviderContext;
      message: UserMessage;
    },
    output: {
      temperature: number;
      topP: number;
      topK: number;
      maxOutputTokens: number | undefined;
      options: Record<string, any>;
    },
  ) => Promise<void>;

  // Modify LLM call headers
  "chat.headers"?: (
    input: {
      sessionID: string;
      agent: string;
      model: Model;
      provider: ProviderContext;
      message: UserMessage;
    },
    output: { headers: Record<string, string> },
  ) => Promise<void>;

  // Auto-allow/deny/ask on permission gates
  "permission.ask"?: (
    input: Permission,
    output: { status: "ask" | "deny" | "allow" },
  ) => Promise<void>;

  // Run before a slash command executes
  "command.execute.before"?: (
    input: { command: string; sessionID: string; arguments: string },
    output: { parts: Part[] },
  ) => Promise<void>;

  // Mutate tool args before the tool runs
  "tool.execute.before"?: (
    input: { tool: string; sessionID: string; callID: string },
    output: { args: any },
  ) => Promise<void>;

  // Inject env vars into shell
  "shell.env"?: (
    input: { cwd: string; sessionID?: string; callID?: string },
    output: { env: Record<string, string> },
  ) => Promise<void>;

  // Inspect/mutate tool output after it runs
  "tool.execute.after"?: (
    input: { tool: string; sessionID: string; callID: string; args: any },
    output: { title: string; output: string; metadata: any },
  ) => Promise<void>;

  // Modify the full message list before sending to LLM
  "experimental.chat.messages.transform"?: (
    input: {},
    output: { messages: { info: Message; parts: Part[] }[] },
  ) => Promise<void>;

  // Modify the system prompt
  "experimental.chat.system.transform"?: (
    input: { sessionID?: string; model: Model },
    output: { system: string[] },
  ) => Promise<void>;

  // Override the small_model selection
  "experimental.provider.small_model"?: (
    input: { provider: ProviderV2 },
    output: { model?: ModelV2 },
  ) => Promise<void>;

  // Inject persistent context before compaction
  "experimental.session.compacting"?: (
    input: { sessionID: string },
    output: { context: string[]; prompt?: string },
  ) => Promise<void>;

  // Control whether to auto-continue after compaction
  "experimental.compaction.autocontinue"?: (
    input: {
      sessionID: string;
      agent: string;
      model: Model;
      provider: ProviderContext;
      message: UserMessage;
      overflow: boolean;
    },
    output: { enabled: boolean },
  ) => Promise<void>;

  // Complete in-progress text parts
  "experimental.text.complete"?: (
    input: { sessionID: string; messageID: string; partID: string },
    output: { text: string },
  ) => Promise<void>;

  // Override tool description/parameters
  "tool.definition"?: (
    input: { toolID: string },
    output: { description: string; parameters: any },
  ) => Promise<void>;

  // Cleanup on unload
  dispose?: () => Promise<void>;
}
```

---

## All event types

Filter in the `event` hook by `event.type`:

| Category     | Event type string                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Session      | `session.created`, `session.updated`, `session.deleted`, `session.idle`, `session.error`, `session.status`, `session.compacted`, `session.diff` |
| Message      | `message.updated`, `message.removed`, `message.part.updated`, `message.part.removed`                                                            |
| Tool         | `tool.execute.before`, `tool.execute.after`                                                                                                     |
| Command      | `command.executed`                                                                                                                              |
| Permission   | `permission.asked`, `permission.replied`                                                                                                        |
| File         | `file.edited`, `file.watcher.updated`                                                                                                           |
| LSP          | `lsp.client.diagnostics`, `lsp.updated`                                                                                                         |
| Installation | `installation.updated`                                                                                                                          |
| Server       | `server.connected`                                                                                                                              |
| Shell        | `shell.env`                                                                                                                                     |
| Todo         | `todo.updated`                                                                                                                                  |
| TUI          | `tui.prompt.append`, `tui.command.execute`, `tui.toast.show`                                                                                    |

Key session events:

| Event             | Meaning                                    |
| ----------------- | ------------------------------------------ |
| `session.idle`    | Model finished generating — task complete  |
| `session.error`   | Session hit an error                       |
| `session.status`  | Status changed: `idle`, `busy`, or `retry` |
| `session.created` | New session started                        |

---

## tool() helper

```ts
import { type Plugin, tool } from "@opencode-ai/plugin";

export const MyPlugin: Plugin = async () => ({
  tool: {
    greet: tool({
      description: "Greet someone by name",
      args: {
        name: tool.schema.string().describe("Name to greet"),
        loud: tool.schema.boolean().optional().describe("Use caps"),
      },
      async execute(args, context) {
        // context: { sessionID, messageID, agent, directory, worktree, abort, metadata(), ask() }
        const msg = `Hello, ${args.name}!`;
        return args.loud ? msg.toUpperCase() : msg;
      },
    }),
  },
});
```

`tool.schema` is Zod v4. Use `tool.schema.string()`, `.number()`, `.boolean()`, `.enum([...])`, `.object({...})`, etc.

`ToolResult` is a `string`. Return a string from `execute`.

---

## Working examples

### Event hook — desktop notification on session idle

```ts
// ~/.config/opencode/plugins/notification.ts
import type { Plugin } from "@opencode-ai/plugin";

export const NotificationPlugin: Plugin = async () => ({
  event: async ({ event }) => {
    if (event.type === "session.idle") {
      // macOS
      if (process.platform === "darwin") {
        // use osascript
      }
    }
  },
});
```

### Shell env injection

```ts
export const InjectEnv: Plugin = async () => ({
  "shell.env": async (input, output) => {
    output.env.MY_API_KEY = "secret";
    output.env.PROJECT_ROOT = input.cwd;
  },
});
```

### Tool middleware — block .env reads

```ts
export const EnvProtection: Plugin = async () => ({
  "tool.execute.before": async (input, output) => {
    if (input.tool === "read" && output.args.filePath?.includes(".env")) {
      throw new Error("Do not read .env files");
    }
  },
});
```

### Compaction context injection

```ts
export const CompactionPlugin: Plugin = async () => ({
  "experimental.session.compacting": async (input, output) => {
    output.context.push("## Project Rules\nAlways use TypeScript strict mode.");
  },
});
```

---

## Import paths

```ts
import type {
  Plugin,
  PluginInput,
  PluginOptions,
  Hooks,
} from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
// or:
import { tool } from "@opencode-ai/plugin/tool";
```

`@opencode-ai/plugin` is installed by opencode into `~/.cache/opencode/node_modules/` automatically. No manual install needed for auto-discovered plugins.

---

## BunShell ($)

`$` is Bun's shell, available as `input.$` in PluginInput. Tagged template — returns `ShellOutput`:

```ts
const result = await $`git status`.text();
const lines = result.split("\n");

// Suppress output and errors:
await $`notify-send "Title" "Message"`.quiet().nothrow();
```

`.nothrow()` — don't throw on non-zero exit. `.quiet()` — suppress stdout/stderr.

---

## Common patterns

### Debounce session.idle (prevent duplicate notifications)

`session.idle` can fire multiple times rapidly. Debounce:

```ts
let lastIdle = 0;
event: async ({ event }) => {
  if (event.type === "session.idle") {
    const now = Date.now();
    if (now - lastIdle < 2000) return;
    lastIdle = now;
    // fire notification
  }
};
```

### Cross-platform notifications (no dependencies)

```ts
import { spawn, spawnSync } from "node:child_process";

function escapeAppleScript(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function notify(title: string, message?: string) {
  const body = message ?? "";
  try {
    if (process.platform === "darwin") {
      const t = escapeAppleScript(title);
      const b = escapeAppleScript(body);
      const script = `display notification "${b}" with title "${t}" sound name "Glass"`;
      spawnSync("osascript", ["-e", script], { stdio: "ignore" });
    } else if (process.platform === "linux") {
      const args = ["--app-name=opencode", title];
      if (body) args.push(body);
      spawnSync("notify-send", args, { stdio: "ignore" });
      // detached so paplay startup latency does not block the event hook
      spawn("paplay", ["/usr/share/sounds/freedesktop/stereo/complete.oga"], {
        stdio: "ignore",
        detached: true,
      }).unref();
    } else if (process.platform === "win32") {
      const t = escapeXml(title);
      const b = escapeXml(body);
      const textNodes = `<text>${t}</text>${b ? `<text>${b}</text>` : ""}`;
      const xml = `<toast><visual><binding template="ToastGeneric">${textNodes}</binding></visual></toast>`;
      const ps = [
        "[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime]",
        "[void][Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType=WindowsRuntime]",
        `$xml = New-Object Windows.Data.Xml.Dom.XmlDocument`,
        `$xml.LoadXml('${xml}')`,
        `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show([Windows.UI.Notifications.ToastNotification]::new($xml))`,
      ].join("; ");
      spawnSync("powershell", ["-NoProfile", "-Command", ps], {
        stdio: "ignore",
      });
    }
  } catch {
    // silently ignore — notification is best-effort
  }
}
```

---

## Anti-patterns

- Do NOT use `require()` — plugins are ESM only (`"type": "module"`)
- Do NOT edit auto-generated files
- Do NOT use `process.cwd()` — use `input.directory` instead
- Do NOT use `tui` export in `PluginModule` — it is typed `never` (server-side plugins only)
- Do NOT assume `notify-send` is installed on Linux — wrap in try/catch
- Do NOT forget `.nothrow()` when using `$` for optional commands
- Do NOT block the event loop — use `spawnSync` only for fire-and-forget notifications, or prefer async `spawn`

---

## After saving any plugin file

Tell the user to quit and restart opencode — the running session keeps using the already-loaded config and plugins until then.
