import { tool } from "@opencode-ai/plugin"
import { readJson } from "../lib/storage"
import { RECENT_FILES_FILE } from "../lib/paths"
import type { RecentFile } from "../types"

export default tool({
  description: "List recently touched files",
  args: {},
  async execute() {
    const entries = await readJson<RecentFile[]>(RECENT_FILES_FILE, [])
    return JSON.stringify(entries)
  },
})
