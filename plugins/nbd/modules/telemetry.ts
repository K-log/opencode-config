import type { Hooks } from "@opencode-ai/plugin"
import { isModuleEnabled, getConfig } from "../config"
import { appendJsonl } from "../lib/storage"
import { TELEMETRY_DIR } from "../lib/paths"
import type { TelemetryEvent } from "../types"

export function telemetryHooks(): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "session.idle") return
      if (!isModuleEnabled("telemetry")) return
      if (getConfig().telemetry !== true) return

      const { sessionID } = event.properties
      const date = new Date().toISOString().slice(0, 10)

      const entry: TelemetryEvent = {
        timestamp: new Date().toISOString(),
        event: "session.ended",
        data: { sessionId: sessionID },
      }
      await appendJsonl(`${TELEMETRY_DIR}/${date}.jsonl`, entry)
    },
  }
}
