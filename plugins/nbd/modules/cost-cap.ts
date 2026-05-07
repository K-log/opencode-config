import type { Hooks } from "@opencode-ai/plugin"
import type { AssistantMessage } from "@opencode-ai/sdk"
import type { createOpencodeClient } from "@opencode-ai/sdk"
import { isModuleEnabled, getConfig } from "../config"
import { readJsonl } from "../lib/storage"
import { COST_FILE } from "../lib/paths"
import { notify } from "../lib/notifier"
import { log } from "../lib/log"
import type { CostRecord } from "../types"

type Client = ReturnType<typeof createOpencodeClient>

export function costCapHooks(client: Client): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "message.updated") return
      // NOTE: costCapUsd is advisory-only. This module notifies when the threshold
      // is exceeded but cannot halt the session — the SDK exposes no abort mechanism.
      // Treat costCapUsd as a warning threshold, not a hard cap.
      if (!isModuleEnabled("cost-cap")) return

      const msg = event.properties.info
      if (msg.role !== "assistant") return

      const assistant = msg as AssistantMessage
      if (!assistant.time.completed) return
      if (!assistant.cost) return

      if (!isModuleEnabled("cost-tracker")) {
        await log(
          client,
          "cost-cap",
          "warn",
          "cost-tracker module is disabled; cost-cap requires it",
        )
      }

      const today = new Date().toISOString().slice(0, 10)
      const allRecords = await readJsonl<CostRecord>(COST_FILE)
      const todayCost = allRecords
        .filter((r) => r.timestamp.startsWith(today))
        .reduce((sum, r) => sum + r.costUsd, 0)

      const totalWithCurrent = todayCost
      const cfg = getConfig()

      if (cfg.costCapUsd !== null && totalWithCurrent > cfg.costCapUsd) {
        await notify("Cost Cap", `Daily cost cap exceeded: $${cfg.costCapUsd}`)
        await log(
          client,
          "cost-cap",
          "warn",
          `daily cap $${cfg.costCapUsd} exceeded (today: $${totalWithCurrent.toFixed(4)})`,
        )
      }
    },
  }
}
