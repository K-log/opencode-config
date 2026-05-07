import { tool } from "@opencode-ai/plugin"
import { getConfig } from "../config"

export default tool({
  description: "Get current NBD plugin config",
  args: {},
  async execute() {
    return JSON.stringify(getConfig())
  },
})
