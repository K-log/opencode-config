import type { Hooks } from "@opencode-ai/plugin"
import type { AssistantMessage, createOpencodeClient } from "@opencode-ai/sdk"
import { isModuleEnabled } from "../config"
import { appendJsonl } from "../lib/storage"
import { COST_FILE } from "../lib/paths"
import { log } from "../lib/log"
import type { CostRecord } from "../types"

type Client = ReturnType<typeof createOpencodeClient>

export function costTrackerHooks(client: Client): Partial<Hooks> {
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
      await log(client, "cost-tracker", "debug", "cost recorded", {
        sessionId: record.sessionId,
        model: record.model,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        costUsd: record.costUsd,
      })
    },
  }
}
