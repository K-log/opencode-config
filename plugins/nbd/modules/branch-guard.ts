import type { Hooks } from "@opencode-ai/plugin"
import type { createOpencodeClient } from "@opencode-ai/sdk"
import { $ } from "bun"
import { isModuleEnabled, getConfig } from "../config"
import { notify } from "../lib/notifier"
import { log } from "../lib/log"

type Client = ReturnType<typeof createOpencodeClient>

export function branchGuardHooks(client: Client): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "session.created") return
      if (!isModuleEnabled("branch-guard")) return
      try {
        const branch = (await $`git branch --show-current`.quiet().text()).trim()
        const protected_ = getConfig().protectedBranches
        if (protected_.includes(branch)) {
          await notify("Branch Guard", `Warning: on protected branch ${branch}`)
          await log(client, "branch-guard", "warn", `session started on protected branch: ${branch}`)
        } else {
          await log(client, "branch-guard", "debug", "branch check passed", { branch })
        }
      } catch {
        // not a git repo or git unavailable
      }
    },
  }
}
