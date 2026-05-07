import { tool } from "@opencode-ai/plugin"
import { readJson, writeJson } from "../lib/storage"
import { MEMORY_FILE } from "../lib/paths"

const MAX_ENTRIES = 500
const MAX_VALUE_BYTES = 4096

export default tool({
  description:
    "Write an entry to agent memory. Upserts by key. Max 500 entries, 4096 bytes per value.",
  args: {
    key: tool.schema.string().describe("Memory key"),
    value: tool.schema.string().describe("Memory value (max 4096 bytes)"),
  },
  async execute({ key, value }) {
    if (new TextEncoder().encode(value).length > MAX_VALUE_BYTES) {
      return JSON.stringify({
        error: `value exceeds ${MAX_VALUE_BYTES} bytes`,
      })
    }
    const entries = await readJson<{ key: string; value: string }[]>(MEMORY_FILE, [])
    const idx = entries.findIndex((e) => e.key === key)
    if (idx >= 0) {
      entries[idx] = { key, value }
    } else {
      entries.push({ key, value })
    }
    // trim oldest entries if over cap
    const trimmed =
      entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries
    await writeJson(MEMORY_FILE, trimmed)
    return JSON.stringify({ key, written: true, total: trimmed.length })
  },
})
