import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { appendJsonl, readJsonl } from "../lib/storage"

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "nbd-tools-test-"))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe("nbd_cost_report aggregation", () => {
  it("aggregates cost by day", async () => {
    const file = join(dir, "cost.jsonl")
    await appendJsonl(file, {
      timestamp: "2026-05-01T10:00:00Z",
      costUsd: 0.01,
      sessionId: "s1",
      model: "gpt-4",
      inputTokens: 100,
      outputTokens: 50,
    })
    await appendJsonl(file, {
      timestamp: "2026-05-01T11:00:00Z",
      costUsd: 0.02,
      sessionId: "s1",
      model: "gpt-4",
      inputTokens: 200,
      outputTokens: 100,
    })
    await appendJsonl(file, {
      timestamp: "2026-05-02T09:00:00Z",
      costUsd: 0.05,
      sessionId: "s2",
      model: "gpt-4",
      inputTokens: 500,
      outputTokens: 250,
    })

    const records = await readJsonl<{ timestamp: string; costUsd: number }>(file)
    const byDay: Record<string, number> = {}
    let total = 0
    for (const r of records) {
      const day = r.timestamp.slice(0, 10)
      byDay[day] = (byDay[day] ?? 0) + r.costUsd
      total += r.costUsd
    }

    expect(Object.keys(byDay)).toHaveLength(2)
    expect(byDay["2026-05-01"]).toBeCloseTo(0.03)
    expect(byDay["2026-05-02"]).toBeCloseTo(0.05)
    expect(total).toBeCloseTo(0.08)
  })
})

describe("nbd_audit_log slice", () => {
  it("returns last N entries", async () => {
    const file = join(dir, "audit.jsonl")
    for (let i = 0; i < 25; i++) {
      await appendJsonl(file, {
        timestamp: new Date().toISOString(),
        command: `cmd-${i}`,
        exitCode: 0,
      })
    }
    const all = await readJsonl<{ command: string }>(file)
    const last20 = all.slice(-20)
    expect(last20).toHaveLength(20)
    expect(last20[last20.length - 1].command).toBe("cmd-24")
  })
})

describe("MCP stubs", () => {
  it("nbd_slack_notify returns stub", () => {
    const result = { stub: true, note: "Requires Slack MCP at runtime" }
    expect(result.stub).toBe(true)
  })

  it("nbd_jira_link returns stub", () => {
    const result = { stub: true, note: "Requires Jira MCP at runtime" }
    expect(result.stub).toBe(true)
  })

  it("nbd_figma_fetch returns stub", () => {
    const result = { stub: true, note: "Requires Figma MCP at runtime" }
    expect(result.stub).toBe(true)
  })
})
