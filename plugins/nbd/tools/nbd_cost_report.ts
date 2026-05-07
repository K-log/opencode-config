import { tool } from "@opencode-ai/plugin"
import { readJsonl } from "../lib/storage"
import { COST_FILE } from "../lib/paths"
import type { CostRecord } from "../types"

export default tool({
  description: "Get cost report aggregated by day",
  args: {},
  async execute() {
    const records = await readJsonl<CostRecord>(COST_FILE)
    const byDay: Record<string, number> = {}
    let total = 0
    for (const r of records) {
      const day = r.timestamp.slice(0, 10)
      byDay[day] = (byDay[day] ?? 0) + r.costUsd
      total += r.costUsd
    }
    return JSON.stringify({ total, byDay, count: records.length })
  },
})
