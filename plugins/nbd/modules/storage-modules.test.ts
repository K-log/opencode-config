import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { readJson, writeJson, appendJsonl, readJsonl } from "../lib/storage"
import type { RecentFile, AuditEntry, CostRecord } from "../types"
import { join } from "node:path"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"

// --- helpers ---

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "nbd-m4-"))
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

// --- recent-files-tracker logic ---

describe("recent-files-tracker logic", () => {
  it("upserts and deduplicates entries", async () => {
    const file = join(tmp, "recent-files.json")
    const now = new Date().toISOString()

    let entries = await readJson<RecentFile[]>(file, [])
    // insert initial
    entries.push({
      path: "/a/foo.ts",
      lastTouched: "2024-01-01T00:00:00.000Z",
    })
    entries.push({
      path: "/a/bar.ts",
      lastTouched: "2024-01-02T00:00:00.000Z",
    })
    await writeJson(file, entries)

    // simulate touching foo.ts again
    const updated = (await readJson<RecentFile[]>(file, [])).filter((e) => e.path !== "/a/foo.ts")
    updated.push({ path: "/a/foo.ts", lastTouched: now })
    const sorted = updated.sort((a, b) => b.lastTouched.localeCompare(a.lastTouched)).slice(0, 50)
    await writeJson(file, sorted)

    const result = await readJson<RecentFile[]>(file, [])
    expect(result[0].path).toBe("/a/foo.ts")
    expect(result.filter((e) => e.path === "/a/foo.ts").length).toBe(1)
  })

  it("caps at 50 entries", async () => {
    const file = join(tmp, "recent-files.json")
    const entries: RecentFile[] = Array.from({ length: 60 }, (_, i) => ({
      path: `/file-${i}.ts`,
      lastTouched: new Date(Date.now() - i * 1000).toISOString(),
    }))
    const capped = entries.sort((a, b) => b.lastTouched.localeCompare(a.lastTouched)).slice(0, 50)
    await writeJson(file, capped)

    const result = await readJson<RecentFile[]>(file, [])
    expect(result.length).toBe(50)
  })
})

// --- audit-logger logic ---

describe("audit-logger logic", () => {
  it("appends AuditEntry with correct command format", async () => {
    const file = join(tmp, "audit.jsonl")
    const filePath = "/some/file.ts"
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      command: `file.edited:${filePath}`,
      exitCode: 0,
    }
    await appendJsonl(file, entry)

    const records = await readJsonl<AuditEntry>(file)
    expect(records.length).toBe(1)
    expect(records[0].command).toBe("file.edited:/some/file.ts")
    expect(records[0].exitCode).toBe(0)
  })
})

// --- cost-cap logic ---

describe("cost-cap daily total calculation", () => {
  it("sums only today's records", async () => {
    const file = join(tmp, "cost.jsonl")
    const today = new Date().toISOString().slice(0, 10)

    const records: CostRecord[] = [
      {
        sessionId: "s1",
        timestamp: `${today}T10:00:00.000Z`,
        model: "m",
        inputTokens: 10,
        outputTokens: 5,
        costUsd: 0.5,
      },
      {
        sessionId: "s1",
        timestamp: `${today}T11:00:00.000Z`,
        model: "m",
        inputTokens: 10,
        outputTokens: 5,
        costUsd: 0.3,
      },
      {
        sessionId: "s2",
        timestamp: "2020-01-01T00:00:00.000Z",
        model: "m",
        inputTokens: 10,
        outputTokens: 5,
        costUsd: 99,
      },
    ]
    for (const r of records) await appendJsonl(file, r)

    const all = await readJsonl<CostRecord>(file)
    const todayCost = all
      .filter((r) => r.timestamp.startsWith(today))
      .reduce((sum, r) => sum + r.costUsd, 0)

    expect(todayCost).toBeCloseTo(0.8)
  })

  it("memory-sync appends entry with sessionId and note", async () => {
    const file = join(tmp, "memory.json")
    const sessionId = "test-session-123"

    const entries = await readJson<object[]>(file, [])
    entries.push({
      timestamp: new Date().toISOString(),
      sessionId,
      note: "session ended",
    })
    await writeJson(file, entries)

    const result = await readJson<Array<{ sessionId: string; note: string }>>(file, [])
    expect(result.length).toBe(1)
    expect(result[0].sessionId).toBe(sessionId)
    expect(result[0].note).toBe("session ended")
  })
})
