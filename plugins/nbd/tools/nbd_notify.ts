import { tool } from "@opencode-ai/plugin"
import { notify } from "../lib/notifier"

export default tool({
  description: "Send a macOS notification",
  args: {
    title: tool.schema.string().describe("Notification title (max 200 chars)"),
    body: tool.schema.string().describe("Notification body (max 200 chars)"),
  },
  async execute({ title, body }) {
    await notify(title, body)
    return JSON.stringify({ sent: true })
  },
})
