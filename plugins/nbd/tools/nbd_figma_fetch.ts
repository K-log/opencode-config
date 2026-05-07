import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Fetch a Figma file via MCP (stub)",
  args: {
    fileKey: tool.schema.string().describe("Figma file key from the file URL"),
  },
  async execute(_args) {
    return JSON.stringify({ stub: true, note: "Requires Figma MCP at runtime" })
  },
})
