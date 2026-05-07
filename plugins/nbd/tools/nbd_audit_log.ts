import { tool } from "@opencode-ai/plugin"
import { readJsonl } from "../lib/storage"
import { AUDIT_FILE } from "../lib/paths"
import type { AuditEntry } from "../types"

export default tool({
  description: "Get recent audit log entries",
  args: {
    limit: tool.schema.number().optional().describe("Max entries to return (default 20)"),
  },
  async execute({ limit }) {
    const entries = await readJsonl<AuditEntry>(AUDIT_FILE)
    const n = Math.min(limit ?? 20, 1000)
    return JSON.stringify(entries.slice(-n))
  },
})
