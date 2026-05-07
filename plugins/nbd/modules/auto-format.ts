import type { Hooks } from "@opencode-ai/plugin"
import type { createOpencodeClient } from "@opencode-ai/sdk"
import { $ } from "bun"
import { extname } from "node:path"
import { isModuleEnabled } from "../config"
import { log } from "../lib/log"

type Client = ReturnType<typeof createOpencodeClient>

const JS_EXTS = new Set([".ts", ".tsx", ".js", ".jsx"])

export function autoFormatHooks(client: Client): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "file.edited") return
      if (!isModuleEnabled("auto-format")) return
      const filePath = event.properties.file
      const ext = extname(filePath)
      try {
        if (JS_EXTS.has(ext)) {
          await $`bunx prettier --write ${filePath}`.quiet()
        } else if (ext === ".go") {
          await $`gofmt -w ${filePath}`.quiet()
        } else if (ext === ".py") {
          await $`black ${filePath}`.quiet()
        } else {
          return
        }
        await log(client, "auto-format", "debug", "file formatted", { file: filePath })
      } catch (err: unknown) {
        await log(client, "auto-format", "warn", "formatter failed", { file: filePath, error: String(err) })
      }
    },
  }
}
