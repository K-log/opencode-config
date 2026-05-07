import type { Hooks } from "@opencode-ai/plugin"

// NOTE: Cannot reliably determine the user's project root from the plugin context.
// process.cwd() resolves to ~/.config/opencode, not the project being worked on.
// auto-stage is a no-op stub. Run `git add -A` manually or use a post-commit hook.

export function autoStageHooks(): Partial<Hooks> {
  return {}
}
