import { tool } from "@opencode-ai/plugin"
import { readJsonl, writeJsonl } from "../lib/storage"
import { UNDO_FILE } from "../lib/paths"
import type { UndoEntry } from "../types"
import { $ } from "bun"
import { isModuleEnabled } from "../config"

export default tool({
  description:
    "Undo the last file change tracked by undo-stack (reverts to last git-committed state)",
  args: {},
  async execute() {
    if (!isModuleEnabled("undo-stack")) {
      return JSON.stringify({ error: "undo-stack module disabled" })
    }

    const entries = await readJsonl<UndoEntry>(UNDO_FILE)
    if (entries.length === 0) return JSON.stringify({ error: "no undo entries" })
    const entry = entries[entries.length - 1]

    try {
      await $`git checkout -- ${entry.filePath}`.quiet()
      // drain the consumed entry
      await writeJsonl(UNDO_FILE, entries.slice(0, -1))
      return JSON.stringify({
        restored: entry.filePath,
        timestamp: entry.timestamp,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return JSON.stringify({ error: `git checkout failed: ${msg}` })
    }
  },
})
