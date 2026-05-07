import { describe, it, expect } from "vitest"
import * as paths from "./paths"

describe("paths", () => {
  it("all paths contain .config/opencode/nbd", () => {
    expect(paths.STATE_DIR).toContain(".config/opencode/nbd")
    expect(paths.SESSIONS_DIR).toContain(".config/opencode/nbd")
    expect(paths.MEMORY_FILE).toContain(".config/opencode/nbd")
    expect(paths.DECISIONS_FILE).toContain(".config/opencode/nbd")
    expect(paths.UNDO_FILE).toContain(".config/opencode/nbd")
    expect(paths.AUDIT_FILE).toContain(".config/opencode/nbd")
    expect(paths.RECENT_FILES_FILE).toContain(".config/opencode/nbd")
    expect(paths.COST_FILE).toContain(".config/opencode/nbd")
    expect(paths.TELEMETRY_DIR).toContain(".config/opencode/nbd")
  })

  it("CONFIG_FILE points to nbd.json", () => {
    expect(paths.CONFIG_FILE).toMatch(/nbd\.json$/)
  })
})
