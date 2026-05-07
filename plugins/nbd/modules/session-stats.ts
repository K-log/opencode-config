import type { Hooks } from "@opencode-ai/plugin"
import type { createOpencodeClient } from "@opencode-ai/sdk"
import { isModuleEnabled } from "../config"
import { writeJson } from "../lib/storage"
import { SESSIONS_DIR } from "../lib/paths"
import { log } from "../lib/log"
import type { SessionRecord } from "../types"

type Client = ReturnType<typeof createOpencodeClient>

type SessionStats = Pick<SessionRecord, "id" | "endedAt">

export function sessionStatsHooks(client: Client): Partial<Hooks> {
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
      await log(client, "session-stats", "debug", "session stats written", { sessionId: sessionID })
    },
  }
}
