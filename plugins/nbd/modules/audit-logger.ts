import type { Hooks } from "@opencode-ai/plugin"
import type { createOpencodeClient } from "@opencode-ai/sdk"
import { isModuleEnabled } from "../config"
import { appendJsonl } from "../lib/storage"
import { AUDIT_FILE } from "../lib/paths"
import { log } from "../lib/log"
import type { AuditEntry } from "../types"

type Client = ReturnType<typeof createOpencodeClient>

export function auditLoggerHooks(client: Client): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "file.edited") return
      if (!isModuleEnabled("audit-logger")) return

      const filePath = event.properties.file
      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        command: `file.edited:${filePath}`,
        exitCode: 0,
      }
      await appendJsonl(AUDIT_FILE, entry)
      await log(client, "audit-logger", "debug", "file edited", { file: filePath })
    },
  }
}
