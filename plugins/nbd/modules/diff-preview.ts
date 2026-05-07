import type { Hooks } from "@opencode-ai/plugin"

// NOTE: No TUI API available in the plugin SDK. diff-preview is a no-op stub.

export function diffPreviewHooks(): Partial<Hooks> {
  return {}
}
