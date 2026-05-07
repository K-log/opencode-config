import type { Hooks } from "@opencode-ai/plugin"
import { isModuleEnabled } from "../config"
import { readJson, writeJson } from "../lib/storage"
import { RECENT_FILES_FILE } from "../lib/paths"
import type { RecentFile } from "../types"

export function recentFilesTrackerHooks(): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "file.edited") return
      if (!isModuleEnabled("recent-files-tracker")) return

      const filePath = event.properties.file
      const now = new Date().toISOString()

      const entries = await readJson<RecentFile[]>(RECENT_FILES_FILE, [])
      const filtered = entries.filter((e) => e.path !== filePath)
      filtered.push({ path: filePath, lastTouched: now })

      const updated = filtered
        .sort((a, b) => b.lastTouched.localeCompare(a.lastTouched))
        .slice(0, 50)
      await writeJson(RECENT_FILES_FILE, updated)
    },
  }
}
