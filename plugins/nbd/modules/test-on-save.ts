import type { Hooks } from "@opencode-ai/plugin"
import type { createOpencodeClient } from "@opencode-ai/sdk"
import { isModuleEnabled } from "../config"
import { log } from "../lib/log"
import { $ } from "bun"

type Client = ReturnType<typeof createOpencodeClient>

export function testOnSaveHooks(client: Client): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "file.edited") return
      if (!isModuleEnabled("test-on-save")) return

      const filePath = event.properties.file
      if (!filePath.endsWith(".test.ts") && !filePath.endsWith(".test.js")) return

      try {
        const result = await $`bun test ${filePath}`.quiet()
        const stdout = result.stdout.toString()
        const stderr = result.stderr.toString()
        if (stdout) await log(client, "test-on-save", "info", stdout)
        if (stderr) await log(client, "test-on-save", "warn", stderr)
      } catch (err) {
        const e = err as { stdout?: Buffer; stderr?: Buffer }
        const stdout = e?.stdout?.toString() ?? ""
        const stderr = e?.stderr?.toString() ?? ""
        if (stdout) await log(client, "test-on-save", "info", stdout)
        if (stderr) await log(client, "test-on-save", "error", stderr)
      }
    },
  }
}
