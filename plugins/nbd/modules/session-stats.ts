import type { Hooks } from "@opencode-ai/plugin"
import { isModuleEnabled } from "../config"
import { writeJson } from "../lib/storage"
import { SESSIONS_DIR } from "../lib/paths"
import type { SessionRecord } from "../types"

type SessionStats = Pick<SessionRecord, "id" | "endedAt">

export function sessionStatsHooks(): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "session.idle") return
      if (!isModuleEnabled("session-stats")) return
      const { sessionID } = event.properties
      const stats: SessionStats = {
        id: sessionID,
        endedAt: new Date().toISOString(),
      }
      await writeJson(`${SESSIONS_DIR}/${sessionID}-stats.json`, stats)
    },
  }
}
