import type { Hooks } from "@opencode-ai/plugin"
import { isModuleEnabled } from "../config"
import { appendJsonl } from "../lib/storage"
import { UNDO_FILE } from "../lib/paths"
import type { UndoEntry } from "../types"

export function undoStackHooks(): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "file.edited") return
      if (!isModuleEnabled("undo-stack")) return
      const filePath = event.properties.file
      try {
        // Records which file was edited. nbd_undo_last uses git checkout to revert.
        const entry: UndoEntry = {
          timestamp: new Date().toISOString(),
          filePath,
        }
        await appendJsonl(UNDO_FILE, entry)
      } catch {
        // file unreadable or write failed
      }
    },
  }
}
