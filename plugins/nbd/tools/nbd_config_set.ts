import { tool } from "@opencode-ai/plugin"
import { setConfigKey } from "../config"

const ALLOWED_KEYS = ["telemetry", "costCapUsd"] as const
type AllowedKey = (typeof ALLOWED_KEYS)[number]

export default tool({
  description:
    "Set a key in NBD plugin config. Allowed keys: telemetry (boolean), costCapUsd (positive number or null)",
  args: {
    key: tool.schema.string().describe(`Config key to set. Allowed: ${ALLOWED_KEYS.join(", ")}`),
    value: tool.schema.string().describe("JSON-encoded value (e.g. 'true', '5.00', 'null')"),
  },
  async execute({ key, value }) {
    if (!ALLOWED_KEYS.includes(key as AllowedKey)) {
      return JSON.stringify({ error: `unknown key: ${key}. Allowed: ${ALLOWED_KEYS.join(", ")}` })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(value)
    } catch {
      return JSON.stringify({ error: `value is not valid JSON: ${value}` })
    }

    if (key === "telemetry") {
      if (typeof parsed !== "boolean") {
        return JSON.stringify({ error: "telemetry must be a boolean (true or false)" })
      }
      await setConfigKey("telemetry", parsed)
    } else if (key === "costCapUsd") {
      if (parsed !== null && (typeof parsed !== "number" || parsed <= 0 || !isFinite(parsed))) {
        return JSON.stringify({ error: "costCapUsd must be a positive finite number or null" })
      }
      await setConfigKey("costCapUsd", parsed as number | null)
    }

    return JSON.stringify({ updated: key, value: parsed })
  },
})
