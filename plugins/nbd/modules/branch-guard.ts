import type { Hooks } from "@opencode-ai/plugin"
import { $ } from "bun"
import { isModuleEnabled, getConfig } from "../config"
import { notify } from "../lib/notifier"

export function branchGuardHooks(): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "session.created") return
      if (!isModuleEnabled("branch-guard")) return
      try {
        const branch = (await $`git branch --show-current`.quiet().text()).trim()
        const protected_ = getConfig().protectedBranches
        if (protected_.includes(branch)) {
          await notify("Branch Guard", `Warning: on protected branch ${branch}`)
        }
      } catch {
        // not a git repo or git unavailable
      }
    },
  }
}
