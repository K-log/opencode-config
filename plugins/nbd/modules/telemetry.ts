import type { Hooks } from "@opencode-ai/plugin"
import type { createOpencodeClient } from "@opencode-ai/sdk"
import { isModuleEnabled, getConfig } from "../config"
import { appendJsonl } from "../lib/storage"
import { TELEMETRY_DIR } from "../lib/paths"
import { log } from "../lib/log"
import type { TelemetryEvent } from "../types"

type Client = ReturnType<typeof createOpencodeClient>

export function telemetryHooks(client: Client): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "session.idle") return
      // Two separate config axes: modules["telemetry"].enabled (module on/off toggle shared
      // with all modules) and config.telemetry (opt-in boolean specific to telemetry data
      // collection). Both must be true for telemetry to fire.
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
      await log(client, "telemetry", "debug", "telemetry event written", { sessionId: sessionID, event: "session.ended" })
    },
  }
}
