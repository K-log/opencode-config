import type { Hooks } from "@opencode-ai/plugin"
import type { createOpencodeClient } from "@opencode-ai/sdk"
import { isModuleEnabled } from "../config"
import { log } from "../lib/log"
import { $ } from "bun"

const LINT_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"]

type Client = ReturnType<typeof createOpencodeClient>

export function lintOnSaveHooks(client: Client): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "file.edited") return
      if (!isModuleEnabled("lint-on-save")) return

      const filePath = event.properties.file
      if (!LINT_EXTENSIONS.some((ext) => filePath.endsWith(ext))) return

      try {
        const result = await $`bunx eslint ${filePath} --max-warnings 0`.quiet()
        const stdout = result.stdout.toString()
        const stderr = result.stderr.toString()
        if (stdout) await log(client, "lint-on-save", "info", stdout)
        if (stderr) await log(client, "lint-on-save", "warn", stderr)
      } catch (err) {
        const e = err as { stdout?: { toString(): string }; stderr?: { toString(): string } }
        const stdout = e?.stdout?.toString() ?? ""
        const stderr = e?.stderr?.toString() ?? ""
        if (stdout) await log(client, "lint-on-save", "info", stdout)
        if (stderr) await log(client, "lint-on-save", "error", stderr)
      }
    },
  }
}
