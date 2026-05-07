import type { Hooks } from "@opencode-ai/plugin"

// NOTE: Cannot install a git pre-commit hook from this plugin because the plugin
// runs in the opencode config directory (~/.config/opencode), not the user's project.
// HOOK_PATH would resolve to the config repo's own .git/hooks, not the project.
// This module is a no-op stub. Install the hook manually:
//   echo '#!/bin/sh\nbun test --passWithNoTests' > .git/hooks/pre-commit
//   chmod +x .git/hooks/pre-commit

export function preCommitHookHooks(): Partial<Hooks> {
  return {}
}
