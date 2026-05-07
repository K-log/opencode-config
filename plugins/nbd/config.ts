import { readJson, writeJson } from "./lib/storage"
import { CONFIG_FILE } from "./lib/paths"
import type { NbdConfig } from "./types"

const DEFAULTS: NbdConfig = {
  modules: {},
  telemetry: false,
  costCapUsd: null,
  protectedBranches: ["main", "master"],
}

let _config: NbdConfig | null = null

export async function loadConfig(): Promise<NbdConfig> {
  const raw = await readJson<Partial<NbdConfig>>(CONFIG_FILE, {})
  _config = {
    ...DEFAULTS,
    ...raw,
    modules: raw.modules ?? {},
  }
  return _config
}

export function getConfig(): NbdConfig {
  return _config ?? DEFAULTS
}

export function isModuleEnabled(name: string): boolean {
  const cfg = getConfig()
  const mod = cfg.modules[name]
  if (mod === undefined) return true // default on
  return mod.enabled
}

export async function setConfigKey<K extends keyof NbdConfig>(
  key: K,
  value: NbdConfig[K],
): Promise<void> {
  if (key === "modules" && (typeof value !== "object" || value === null || Array.isArray(value))) {
    throw new Error("[nbd] setConfigKey: modules must be a plain object")
  }
  const cfg = getConfig()
  const updated = { ...cfg, [key]: value }
  _config = updated
  await writeJson(CONFIG_FILE, updated)
}
