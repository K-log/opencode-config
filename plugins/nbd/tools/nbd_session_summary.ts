import { tool } from "@opencode-ai/plugin"
import { readdir } from "node:fs/promises"
import { SESSIONS_DIR } from "../lib/paths"

export default tool({
  description: "Get the latest session summary",
  args: {},
  async execute() {
    let files: string[]
    try {
      files = await readdir(SESSIONS_DIR)
    } catch {
      return JSON.stringify(null)
    }
    const sorted = files.sort()
    // sort is lexicographic — correct only because session filenames are ISO-8601 prefixed
    if (sorted.length === 0) return JSON.stringify(null)
    const latest = sorted[sorted.length - 1]
    const content = await Bun.file(`${SESSIONS_DIR}/${latest}`).json()
    return JSON.stringify(content)
  },
})
