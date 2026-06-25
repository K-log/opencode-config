import type { Plugin } from "@opencode-ai/plugin"
import { existsSync } from "node:fs"
import { spawn, spawnSync } from "node:child_process"

// Notify the user when a session goes idle (task complete) or errors.
// Cross-platform: macOS (osascript), Linux (notify-send + paplay), Windows (PowerShell WinRT toast).
//
// Linux / KDE Plasma 6 notes:
//   - urgency: normal (idle) / critical (error) — critical never auto-expires on KDE
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

// Debounce: session.idle / session.error can fire multiple times in rapid succession.
let lastIdleAt = 0
let lastErrorAt = 0
const DEBOUNCE_MS = 2000

export const NotificationPlugin: Plugin = async () => ({
  event: async ({ event }) => {
    if (event.type === "session.idle") {
      const now = Date.now()
      if (now - lastIdleAt < DEBOUNCE_MS) return
      lastIdleAt = now
      notify("opencode", "Session complete", {
        urgency: "normal",
        icon: "dialog-information",
        soundPath: SOUNDS.complete,
        expireMs: 8000,
      })
    }

    if (event.type === "session.error") {
      const now = Date.now()
      if (now - lastErrorAt < DEBOUNCE_MS) return
      lastErrorAt = now
      const err = (event as { type: "session.error"; error?: string }).error
      notify("opencode — error", err ?? "Session encountered an error", {
        urgency: "critical",
        icon: "dialog-error",
        soundPath: SOUNDS.error,
      })
    }
  },
})
