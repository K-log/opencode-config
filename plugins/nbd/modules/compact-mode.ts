import type { Hooks } from "@opencode-ai/plugin"

// NOTE: Context compaction is managed by opencode config (compaction.reserved).
// compact-mode is a no-op stub — no plugin API exists to influence compaction.

export function compactModeHooks(): Partial<Hooks> {
  return {}
}
