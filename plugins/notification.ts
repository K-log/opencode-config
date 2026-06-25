import type { Plugin } from "@opencode-ai/plugin"
import type {
  Todo,
  Session,
  Permission,
} from "@opencode-ai/sdk/dist/gen/types.gen"
import { existsSync } from "node:fs"
import { spawn, spawnSync } from "node:child_process"

// Notify the user when a session goes idle (task complete), requires action,
// or errors. Rich body: session title, todo summary, permission details.
//
// Cross-platform: macOS (osascript), Linux (notify-send + paplay), Windows (PowerShell WinRT toast).
//
// Linux / KDE Plasma 6 notes:
//   - urgency: normal (idle) / critical (error/permission) — critical never auto-expires on KDE
//   - icon: freedesktop icon names resolved via the active icon theme (Breeze etc.)
//   - sound: KDE ignores sound-name DBus hints; paplay is used separately via PipeWire/PulseAudio
//   - sound-theme-freedesktop package must be installed for .oga paths to exist

function escapeAppleScript(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

type Urgency = "low" | "normal" | "critical"

interface NotifyOptions {
  urgency?: Urgency
  // freedesktop icon name or absolute path
  icon?: string
  // absolute path to .oga/.wav/.mp3 — played via paplay on linux (best-effort)
  soundPath?: string
  // milliseconds before auto-dismiss (linux/macOS only; KDE ignores for critical)
  expireMs?: number
}

function notify(title: string, message?: string, opts: NotifyOptions = {}) {
  const body = message ?? ""
  const { urgency = "normal", icon, soundPath, expireMs } = opts
  try {
    if (process.platform === "darwin") {
      const t = escapeAppleScript(title)
      const b = escapeAppleScript(body)
      const script = `display notification "${b}" with title "${t}" sound name "Glass"`
      spawnSync("osascript", ["-e", script], { stdio: "ignore" })
    } else if (process.platform === "linux") {
      const args = [
        `--app-name=opencode`,
        `--urgency=${urgency}`,
      ]
      if (icon) args.push(`--icon=${icon}`)
      if (expireMs != null) args.push(`--expire-time=${expireMs}`)
      args.push(title)
      if (body) args.push(body)
      spawnSync("notify-send", args, { stdio: "ignore" })
      // KDE Plasma 6 ignores sound-name hints — play sound separately via paplay.
      // paplay is detached so its startup latency does not stall the event hook.
      if (soundPath && existsSync(soundPath)) {
        spawn("paplay", [soundPath], { stdio: "ignore", detached: true }).unref()
      }
    } else if (process.platform === "win32") {
      const t = escapeXml(title)
      const b = escapeXml(body)
      const textNodes = `<text>${t}</text>${b ? `<text>${b}</text>` : ""}`
      const xml = `<toast><visual><binding template="ToastGeneric">${textNodes}</binding></visual></toast>`
      const ps = [
        "[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime]",
        "[void][Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType=WindowsRuntime]",
        "$xml = New-Object Windows.Data.Xml.Dom.XmlDocument",
        `$xml.LoadXml('${xml}')`,
        "$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe')",
        "$notifier.Show([Windows.UI.Notifications.ToastNotification]::new($xml))",
      ].join("; ")
      spawnSync("powershell", ["-NoProfile", "-Command", ps], { stdio: "ignore" })
    }
  } catch {
    // best-effort — never throw from a notification
  }
}

const SOUNDS = {
  complete: "/usr/share/sounds/freedesktop/stereo/complete.oga",
  error: "/usr/share/sounds/freedesktop/stereo/dialog-error.oga",
} as const

// Per-session state
const sessionTitles = new Map<string, string>()
const sessionTodos = new Map<string, Todo[]>()
// Sessions with a parentID are subagent tasks — suppress notifications for them
const subagentSessions = new Set<string>()

function buildTodoSummary(todos: Todo[]): string {
  if (todos.length === 0) return ""

  const completed = todos.filter((t) => t.status === "completed")
  const inProgress = todos.filter((t) => t.status === "in_progress")
  const pending = todos.filter((t) => t.status === "pending")

  const parts: string[] = []

  if (completed.length > 0) {
    parts.push(`${completed.length}/${todos.length} done`)
  }

  // Surface the active/pending task by name (first one, truncated)
  const active = inProgress[0] ?? pending[0]
  if (active) {
    const label = active.content.length > 60
      ? active.content.slice(0, 57) + "..."
      : active.content
    parts.push(`waiting: ${label}`)
  }

  return parts.join(" · ")
}

function buildErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Session encountered an error"
  const e = error as { data?: { message?: string }; name?: string }
  return e.data?.message ?? e.name ?? "Session encountered an error"
}

// Debounce: session.idle / session.error can fire multiple times in rapid succession.
let lastIdleAt = 0
let lastErrorAt = 0
const DEBOUNCE_MS = 2000

// Track permission IDs we've already notified for (cleared on reply)
const notifiedPermissions = new Set<string>()

export const NotificationPlugin: Plugin = async () => ({
  event: async ({ event }) => {
    // Cache session title
    if (event.type === "session.created" || event.type === "session.updated") {
      const info = (event as { type: string; properties: { info: Session } }).properties.info
      if (info?.id && info?.title) {
        sessionTitles.set(info.id, info.title)
      }
      if (info?.parentID) {
        subagentSessions.add(info.id)
      }
    }

    if (event.type === "session.deleted") {
      const info = (event as { type: string; properties: { info: Session } }).properties.info
      if (info?.id) {
        sessionTitles.delete(info.id)
        sessionTodos.delete(info.id)
        subagentSessions.delete(info.id)
      }
    }

    // Cache todos
    if (event.type === "todo.updated") {
      const props = (event as { type: string; properties: { sessionID: string; todos: Todo[] } }).properties
      sessionTodos.set(props.sessionID, props.todos)
    }

    // Action required: permission gate opened
    if (event.type === "permission.updated") {
      const perm = (event as { type: string; properties: Permission }).properties
      if (subagentSessions.has(perm.sessionID)) return
      if (notifiedPermissions.has(perm.id)) return
      notifiedPermissions.add(perm.id)

      const title = sessionTitles.get(perm.sessionID)
      const notifTitle = title ? `opencode — action required` : `opencode — action required`
      const pattern = Array.isArray(perm.pattern)
        ? perm.pattern.join(", ")
        : perm.pattern ?? ""
      const body = [
        title,
        perm.title || perm.type,
        pattern ? `(${pattern})` : "",
      ].filter(Boolean).join(" · ")

      notify(notifTitle, body || undefined, {
        urgency: "critical",
        icon: "dialog-question",
      })
    }

    // Clear permission tracking on reply
    if (event.type === "permission.replied") {
      const props = (event as { type: string; properties: { permissionID: string } }).properties
      notifiedPermissions.delete(props.permissionID)
    }

    // Session complete
    if (event.type === "session.idle") {
      const now = Date.now()
      if (now - lastIdleAt < DEBOUNCE_MS) return
      lastIdleAt = now

      const props = (event as { type: string; properties: { sessionID: string } }).properties
      if (subagentSessions.has(props.sessionID)) return
      const sessionTitle = sessionTitles.get(props.sessionID)
      const todos = sessionTodos.get(props.sessionID) ?? []
      const todoSummary = buildTodoSummary(todos)

      const notifTitle = sessionTitle ? `opencode — ${sessionTitle}` : `opencode`
      const body = todoSummary || "Session complete"

      notify(notifTitle, body, {
        urgency: "normal",
        icon: "dialog-information",
        soundPath: SOUNDS.complete,
        expireMs: 8000,
      })
    }

    // Session error
    if (event.type === "session.error") {
      const now = Date.now()
      if (now - lastErrorAt < DEBOUNCE_MS) return
      lastErrorAt = now

      const props = (event as { type: string; properties: { sessionID?: string; error?: unknown } }).properties
      if (props.sessionID && subagentSessions.has(props.sessionID)) return
      const sessionTitle = props.sessionID ? sessionTitles.get(props.sessionID) : undefined
      const notifTitle = sessionTitle
        ? `opencode — error · ${sessionTitle}`
        : `opencode — error`

      notify(notifTitle, buildErrorMessage(props.error), {
        urgency: "critical",
        icon: "dialog-error",
        soundPath: SOUNDS.error,
      })
    }
  },
})
