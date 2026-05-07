import { tool } from "@opencode-ai/plugin"
import { isModuleEnabled } from "../config"

const KNOWN_MODULES = [
  "session-logger",
  "decision-logger",
  "cost-tracker",
  "auto-stage",
  "session-stats",
  "auto-format",
  "branch-guard",
  "commit-guard",
  "undo-stack",
  "pre-commit-hook",
  "secret-scanner",
  "test-on-save",
  "lint-on-save",
  "memory-sync",
  "context-injector",
  "audit-logger",
  "cost-cap",
  "telemetry",
  "recent-files-tracker",
  "slack-notifier",
  "jira-link",
  "github-pr",
  "figma-fetch",
  "progress-bar",
  "diff-preview",
  "compact-mode",
] as const

export default tool({
  description: "Get enabled/disabled status of all NBD modules",
  args: {},
  async execute() {
    const status: Record<string, boolean> = {}
    for (const name of KNOWN_MODULES) {
      status[name] = isModuleEnabled(name)
    }
    return JSON.stringify(status)
  },
})
