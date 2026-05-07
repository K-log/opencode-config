import type { Hooks } from "@opencode-ai/plugin"

// NOTE: The SDK does not support injecting content into prompts from a plugin hook.
// context-injector is a no-op stub. Use nbd_memory_read and nbd_log_decision tools
// to read/write context manually during a session.

export function contextInjectorHooks(): Partial<Hooks> {
  return {}
}
