import { mkdir, appendFile } from "node:fs/promises"
import { dirname } from "node:path"

// appendJsonl uses node:fs/promises appendFile (atomic single-write, no read-modify-write).
// Reads use Bun.file for performance. This asymmetry is intentional.

async function ensureDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
}

export async function appendJsonl<T>(filePath: string, record: T): Promise<void> {
  await ensureDir(filePath)
  await appendFile(filePath, JSON.stringify(record) + "\n")
}

export async function readJsonl<T>(filePath: string): Promise<T[]> {
  const file = Bun.file(filePath)
  if (!(await file.exists())) return []
  const text = await file.text()
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T)
}

export async function writeJsonl<T>(filePath: string, records: T[]): Promise<void> {
  await ensureDir(filePath)
  const content =
    records.map((r) => JSON.stringify(r)).join("\n") + (records.length > 0 ? "\n" : "")
  await Bun.write(filePath, content)
}

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  const file = Bun.file(filePath)
  if (!(await file.exists())) return fallback
  return (await file.json()) as T
}

export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await ensureDir(filePath)
  await Bun.write(filePath, JSON.stringify(data, null, 2) + "\n")
}
