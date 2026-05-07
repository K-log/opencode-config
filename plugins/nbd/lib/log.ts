import type { createOpencodeClient } from "@opencode-ai/sdk"

type Client = ReturnType<typeof createOpencodeClient>

export async function log(
  client: Client,
  service: string,
  level: "debug" | "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  await client.app.log({
    body: { service, level, message, ...(extra ? { extra } : {}) },
  })
}
