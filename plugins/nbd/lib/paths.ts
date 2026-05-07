const HOME = Bun.env.HOME
if (!HOME) throw new Error("[nbd] HOME environment variable is not set")
const CONFIG_ROOT = `${HOME}/.config/opencode`

export const CONFIG_FILE = `${CONFIG_ROOT}/nbd.json`
export const STATE_DIR = `${CONFIG_ROOT}/nbd`
export const SESSIONS_DIR = `${STATE_DIR}/sessions`
export const MEMORY_FILE = `${STATE_DIR}/memory.json`
export const SESSION_EVENTS_FILE = `${STATE_DIR}/session-events.jsonl`
export const DECISIONS_FILE = `${STATE_DIR}/decisions.jsonl`
export const UNDO_FILE = `${STATE_DIR}/undo.jsonl`
export const AUDIT_FILE = `${STATE_DIR}/audit.jsonl`
export const RECENT_FILES_FILE = `${STATE_DIR}/recent-files.json`
export const COST_FILE = `${STATE_DIR}/cost.jsonl`
export const TELEMETRY_DIR = `${STATE_DIR}/telemetry`
