import { tool } from "@opencode-ai/plugin"
import { readJson } from "../lib/storage"
import { MEMORY_FILE } from "../lib/paths"

export default tool({
  description: "Read agent memory entries",
  args: {},
  async execute() {
    const entries = await readJson<{ key: string; value: string }[]>(MEMORY_FILE, [])
    return JSON.stringify(entries)
  },
})
