import type { Hooks } from "@opencode-ai/plugin"
import { isModuleEnabled } from "../config"
import { writeJson } from "../lib/storage"
import { SESSIONS_DIR } from "../lib/paths"
import type { SessionRecord } from "../types"

export function sessionLoggerHooks(): Partial<Hooks> {
  const sessionStart = new Map<string, string>()

  return {
    async event({ event }) {
      if (event.type === "session.created") {
        if (!isModuleEnabled("session-logger")) return
        const { id } = event.properties
        sessionStart.set(id, new Date().toISOString())
      }

      if (event.type === "session.idle") {
        if (!isModuleEnabled("session-logger")) return
        const { sessionID } = event.properties
        const startedAt = sessionStart.get(sessionID) ?? new Date().toISOString()
        sessionStart.delete(sessionID)
        const record: SessionRecord = {
          id: sessionID,
          startedAt,
          endedAt: new Date().toISOString(),
        }
        await writeJson(`${SESSIONS_DIR}/${sessionID}.json`, record)
      }
    },
  }
}
