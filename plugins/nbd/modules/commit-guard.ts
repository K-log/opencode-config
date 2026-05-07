import type { Hooks } from "@opencode-ai/plugin"

// NOTE: The SDK exposes no bash/tool-intercept hook.
// commit-guard cannot intercept `git commit` at the SDK level.
// This module is a no-op stub. Use a git pre-commit hook instead:
//   echo '#!/bin/sh\nbun test --passWithNoTests' > .git/hooks/pre-commit
//   chmod +x .git/hooks/pre-commit

export function commitGuardHooks(): Partial<Hooks> {
  return {}
}
