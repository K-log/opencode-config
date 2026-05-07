import type { Hooks } from "@opencode-ai/plugin"
import type { AssistantMessage } from "@opencode-ai/sdk"
import { isModuleEnabled } from "../config"
import { appendJsonl } from "../lib/storage"
import { COST_FILE } from "../lib/paths"
import type { CostRecord } from "../types"

export function costTrackerHooks(): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "message.updated") return
      if (!isModuleEnabled("cost-tracker")) return

      const msg = event.properties.info
      if (msg.role !== "assistant") return

      const assistant = msg as AssistantMessage
      if (!assistant.time.completed) return
      if (!assistant.cost) return

      const record: CostRecord = {
        sessionId: assistant.sessionID,
        timestamp: new Date(assistant.time.completed).toISOString(),
        model: `${assistant.providerID}/${assistant.modelID}`,
        inputTokens: assistant.tokens.input,
        outputTokens: assistant.tokens.output,
        costUsd: assistant.cost,
      }
      await appendJsonl(COST_FILE, record)
    },
  }
}
