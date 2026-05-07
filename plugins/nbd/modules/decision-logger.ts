import { tool } from "@opencode-ai/plugin"
import { isModuleEnabled } from "../config"
import { appendJsonl } from "../lib/storage"
import { DECISIONS_FILE } from "../lib/paths"
import type { DecisionRecord } from "../types"

export const decisionLoggerTool = tool({
  description: "Log an architectural or implementation decision with rationale.",
  args: {
    decision: tool.schema.string().describe("The decision made"),
    rationale: tool.schema.string().describe("Why this decision was made"),
  },
  async execute({ decision, rationale }) {
    if (!isModuleEnabled("decision-logger")) {
      return "decision-logger module disabled"
    }
    const record: DecisionRecord = {
      timestamp: new Date().toISOString(),
      decision,
      rationale,
    }
    await appendJsonl(DECISIONS_FILE, record)
    return `Decision logged: ${decision}`
  },
})
