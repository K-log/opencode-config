import type { Hooks } from "@opencode-ai/plugin"

// NOTE: No TUI API available in the plugin SDK. progress-bar is a no-op stub.

export function progressBarHooks(): Partial<Hooks> {
  return {}
}
