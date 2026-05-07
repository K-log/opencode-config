import { describe, it, expect, beforeEach } from "vitest"
import { isModuleEnabled, loadConfig, getConfig } from "./config"

// Reset module state between tests by reloading config with a temp file.
// Since paths.ts reads Bun.env.HOME at module load time, we test the
// exported functions directly using the in-memory state.

describe("isModuleEnabled", () => {
  beforeEach(async () => {
    // Load config with empty modules (all default to enabled)
    await loadConfig()
  })

  it("returns true for unknown module (default on)", () => {
    expect(isModuleEnabled("some-nonexistent-module")).toBe(true)
  })

  it("returns true for module not in config", () => {
    expect(isModuleEnabled("cost-tracker")).toBe(true)
  })

  it("reflects explicit disable after config mutation", () => {
    // Directly mutate the in-memory config to simulate a disabled module
    const cfg = getConfig()
    cfg.modules["test-module"] = { enabled: false }
    expect(isModuleEnabled("test-module")).toBe(false)
  })

  it("reflects explicit enable after config mutation", () => {
    const cfg = getConfig()
    cfg.modules["test-module2"] = { enabled: true }
    expect(isModuleEnabled("test-module2")).toBe(true)
  })
})
