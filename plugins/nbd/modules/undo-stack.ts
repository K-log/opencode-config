import type { Hooks } from "@opencode-ai/plugin"
import type { createOpencodeClient } from "@opencode-ai/sdk"
import { isModuleEnabled } from "../config"
import { appendJsonl } from "../lib/storage"
import { UNDO_FILE } from "../lib/paths"
import { log } from "../lib/log"
import type { UndoEntry } from "../types"

type Client = ReturnType<typeof createOpencodeClient>

export function undoStackHooks(client: Client): Partial<Hooks> {
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
        await log(client, "undo-stack", "debug", "undo entry recorded", { file: filePath })
      } catch {
        await log(client, "undo-stack", "warn", "failed to record undo entry", { file: filePath })
      }
    },
  }
}
