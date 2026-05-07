import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Create a Jira issue via MCP (stub)",
  args: {
    summary: tool.schema.string().describe("Jira issue summary/title"),
    description: tool.schema.string().describe("Jira issue description"),
  },
  async execute(_args) {
    return JSON.stringify({ stub: true, note: "Requires Jira MCP at runtime" })
  },
})
