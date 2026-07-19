#!/usr/bin/env node
// Desktop notifications for Claude Code, ported from the opencode
// notification plugin (plugins/notification.ts).
//
// Wired to two hook events in settings.json:
//   - Notification: Claude needs permission/input -> critical notification
//   - Stop: main agent finished responding -> normal notification + sound
//
// Cross-platform: macOS (osascript), Linux (notify-send + paplay),
// Windows (PowerShell WinRT toast).
//
// Linux / KDE Plasma 6 notes (carried over from the opencode plugin):
//   - urgency: normal (stop) / critical (permission) — critical never
//     auto-expires on KDE
//   - KDE ignores sound-name DBus hints; paplay is used separately
//   - sound-theme-freedesktop package must be installed for .oga paths

import { spawn, spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

function escapeAppleScript(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function notify(title, message, opts = {}) {
  const body = message ?? ""
  const { urgency = "normal", icon, soundPath, expireMs } = opts
  try {
    if (process.platform === "darwin") {
      const t = escapeAppleScript(title)
      const b = escapeAppleScript(body)
      const script = `display notification "${b}" with title "${t}" sound name "Glass"`
      spawnSync("osascript", ["-e", script], { stdio: "ignore" })
    } else if (process.platform === "linux") {
      const args = ["--app-name=claude-code", `--urgency=${urgency}`]
      if (icon) args.push(`--icon=${icon}`)
      if (expireMs != null) args.push(`--expire-time=${expireMs}`)
      args.push(title)
      if (body) args.push(body)
      spawnSync("notify-send", args, { stdio: "ignore" })
      // KDE Plasma 6 ignores sound-name hints — play sound separately.
      // paplay is detached so its startup latency does not stall the hook.
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
    // best-effort — never fail the hook over a notification
  }
}

const SOUNDS = {
  complete: "/usr/share/sounds/freedesktop/stereo/complete.oga",
  error: "/usr/share/sounds/freedesktop/stereo/dialog-error.oga",
}

// Hooks are one-shot processes, so the plugin's in-memory debounce becomes a
// timestamp file: skip if the same event fired within the window.
const DEBOUNCE_MS = 2000

function debounced(eventName) {
  const stamp = path.join(tmpdir(), `claude-code-notify-${eventName}`)
  try {
    const last = Number(readFileSync(stamp, "utf-8"))
    if (Date.now() - last < DEBOUNCE_MS) return true
  } catch {
    // no stamp yet
  }
  try {
    writeFileSync(stamp, String(Date.now()), "utf-8")
  } catch {
    // best-effort
  }
  return false
}

function readStdin() {
  try {
    return readFileSync(0, "utf-8")
  } catch {
    return ""
  }
}

let input = {}
try {
  input = JSON.parse(readStdin())
} catch {
  process.exit(0)
}

const event = input.hook_event_name

if (event === "Notification") {
  // Permission request or idle-input prompt — action required.
  if (!debounced("notification")) {
    notify("Claude Code — action required", input.message || "Awaiting input", {
      urgency: "critical",
      icon: "dialog-question",
    })
  }
} else if (event === "Stop") {
  // Main agent finished (SubagentStop is intentionally not wired up in
  // settings.json — mirrors the opencode plugin suppressing subagent
  // sessions).
  if (!debounced("stop")) {
    const cwd = input.cwd ? path.basename(input.cwd) : undefined
    notify(cwd ? `Claude Code — ${cwd}` : "Claude Code", "Session complete", {
      urgency: "normal",
      icon: "dialog-information",
      soundPath: SOUNDS.complete,
      expireMs: 8000,
    })
  }
}

process.exit(0)
