import type { Hooks } from "@opencode-ai/plugin"
import { isModuleEnabled } from "../config"
import { appendJsonl } from "../lib/storage"
import { AUDIT_FILE } from "../lib/paths"
import type { AuditEntry } from "../types"

export function auditLoggerHooks(): Partial<Hooks> {
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
    },
  }
}
