export interface ModuleConfig {
  enabled: boolean
}

export interface NbdConfig {
  modules: Record<string, ModuleConfig>
  telemetry: boolean
  costCapUsd: number | null
  protectedBranches: string[]
}

export interface SessionRecord {
  id: string
  startedAt: string
  endedAt: string
  filesChanged?: string[]
  toolCalls?: number
  totalCostUsd?: number
}

export interface CostRecord {
  sessionId: string
  timestamp: string
  model: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export interface DecisionRecord {
  timestamp: string
  decision: string
  rationale: string
}

export interface UndoEntry {
  timestamp: string
  filePath: string
}

export interface AuditEntry {
  timestamp: string
  command: string
  exitCode: number
}

export interface RecentFile {
  path: string
  lastTouched: string
}

export interface TelemetryEvent {
  timestamp: string
  event: string
  data: Record<string, unknown>
}
