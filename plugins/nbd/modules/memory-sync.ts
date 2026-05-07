import type { Hooks } from "@opencode-ai/plugin"
import { isModuleEnabled } from "../config"
import { appendJsonl } from "../lib/storage"
import { SESSION_EVENTS_FILE } from "../lib/paths"

interface SessionEvent {
  timestamp: string
  sessionId: string
  note: string
}

export function memorySyncHooks(): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "session.idle") return
      if (!isModuleEnabled("memory-sync")) return

      const { sessionID } = event.properties
      const entry: SessionEvent = {
        timestamp: new Date().toISOString(),
        sessionId: sessionID,
        note: "session ended",
      }
      await appendJsonl(SESSION_EVENTS_FILE, entry)
    },
  }
}
