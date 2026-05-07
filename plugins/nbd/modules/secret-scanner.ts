import type { Hooks } from "@opencode-ai/plugin"
import type { createOpencodeClient } from "@opencode-ai/sdk"
import { isModuleEnabled } from "../config"
import { notify } from "../lib/notifier"
import { log } from "../lib/log"

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/, // AWS access key
  /ghp_[a-zA-Z0-9]{36}/, // GitHub PAT
  /sk-[a-zA-Z0-9]{48}/, // OpenAI secret key
  /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/, // PEM private key
  /[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/, // JWT
  /sk-ant-[a-zA-Z0-9\-_]{40,}/, // Anthropic
  /xox[bpas]-[0-9A-Za-z\-]{10,}/, // Slack token
  /sk_live_[a-zA-Z0-9]{24,}/, // Stripe live secret
  /rk_live_[a-zA-Z0-9]{24,}/, // Stripe restricted
  /npm_[a-zA-Z0-9]{36}/, // npm token
  /"type"\s*:\s*"service_account"/, // GCP service account JSON
]

type Client = ReturnType<typeof createOpencodeClient>

export function secretScannerHooks(client: Client): Partial<Hooks> {
  return {
    async event({ event }) {
      if (event.type !== "file.edited") return
      if (!isModuleEnabled("secret-scanner")) return

      const filePath = event.properties.file

      let content: string
      try {
        content = await Bun.file(filePath).text()
      } catch {
        return
      }

      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(content)) {
          await notify("Secret Scanner", `Potential secret detected in ${filePath}`)
          await log(client, "secret-scanner", "warn", `potential secret in ${filePath}`)
          break
        }
      }
    },
  }
}
