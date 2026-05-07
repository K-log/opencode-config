import type { Hooks } from "@opencode-ai/plugin"
import { $ } from "bun"
import { extname } from "node:path"
import { isModuleEnabled } from "../config"

const JS_EXTS = new Set([".ts", ".tsx", ".js", ".jsx"])

export function autoFormatHooks(): Partial<Hooks> {
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
        }
      } catch {
        // formatter not installed or failed
      }
    },
  }
}
