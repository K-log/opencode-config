import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Send a Slack message via MCP (stub)",
  args: {
    channel: tool.schema.string().describe("Slack channel ID or name"),
    message: tool.schema.string().describe("Message text to send"),
  },
  async execute(_args) {
    return JSON.stringify({ stub: true, note: "Requires Slack MCP at runtime" })
  },
})
