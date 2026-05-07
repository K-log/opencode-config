import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { appendJsonl, readJsonl, readJson, writeJson } from "./storage"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "nbd-test-"))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe("appendJsonl / readJsonl", () => {
  it("round-trips records", async () => {
    const file = join(dir, "test.jsonl")
    await appendJsonl(file, { a: 1 })
    await appendJsonl(file, { b: 2 })
    const records = await readJsonl<{ a?: number; b?: number }>(file)
    expect(records).toHaveLength(2)
    expect(records[0]).toEqual({ a: 1 })
    expect(records[1]).toEqual({ b: 2 })
  })

  it("returns empty array for missing file", async () => {
    const records = await readJsonl(join(dir, "missing.jsonl"))
    expect(records).toEqual([])
  })
})

describe("readJson / writeJson", () => {
  it("round-trips JSON", async () => {
    const file = join(dir, "test.json")
    await writeJson(file, { x: 42 })
    const result = await readJson<{ x: number }>(file, { x: 0 })
    expect(result).toEqual({ x: 42 })
  })

  it("returns fallback for missing file", async () => {
    const result = await readJson(join(dir, "missing.json"), { default: true })
    expect(result).toEqual({ default: true })
  })
})
