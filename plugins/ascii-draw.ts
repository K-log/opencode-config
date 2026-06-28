import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { spawn, spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { existsSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"

const canvasScript = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "scripts",
  "ascii-draw-canvas.ts",
)

function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'"
}

function launchCanvas(
  bunBin: string,
  script: string,
  urlFile: string,
  w: string,
  h: string,
): boolean {
  const scriptArgs = ["--url-file", urlFile, "--width", w, "--height", h]

  if (process.platform === "win32") {
    const wtCheck = spawnSync("where", ["wt.exe"], { stdio: "pipe" })
    if (wtCheck.status === 0) {
      spawn("wt.exe", ["-w", "_new", "new-tab", "--", bunBin, script, ...scriptArgs], {
        detached: true,
        stdio: "ignore",
      }).unref()
    } else {
      spawn("cmd.exe", ["/c", "start", "ASCII Draw", `"${bunBin}"`, `"${script}"`, ...scriptArgs], {
        detached: true,
        stdio: "ignore",
      }).unref()
    }
    return true
  }

  if (process.platform === "darwin") {
    const cmd = [bunBin, script, ...scriptArgs].map(shellQuote).join(" ")
    const escaped = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"')

    if (
      existsSync("/Applications/iTerm.app") ||
      existsSync(homedir() + "/Applications/iTerm.app")
    ) {
      const result = spawnSync(
        "osascript",
        ["-e", `tell application "iTerm2" to create window with default profile command "${escaped}"`],
        { stdio: "ignore" },
      )
      if (result.status === 0) return true
    }

    const result = spawnSync(
      "osascript",
      ["-e", `tell application "Terminal" to do script "${escaped}"`],
      { stdio: "ignore" },
    )
    if (result.status === 0) return true

    return false
  }

  if (process.platform === "linux") {
    type Candidate = {
      check: string
      build: (b: string, s: string, a: string[]) => { bin: string; args: string[] }
    }

    const candidates: Candidate[] = [
      { check: "gnome-terminal", build: (b, s, a) => ({ bin: "gnome-terminal", args: ["--", b, s, ...a] }) },
      { check: "alacritty",      build: (b, s, a) => ({ bin: "alacritty",      args: ["-e", b, s, ...a] }) },
      { check: "kitty",          build: (b, s, a) => ({ bin: "kitty",          args: [b, s, ...a] }) },
      { check: "wezterm",        build: (b, s, a) => ({ bin: "wezterm",        args: ["start", "--", b, s, ...a] }) },
      { check: "foot",           build: (b, s, a) => ({ bin: "foot",           args: [b, s, ...a] }) },
      { check: "konsole",        build: (b, s, a) => ({ bin: "konsole",        args: ["--", b, s, ...a] }) },
      { check: "x-terminal-emulator", build: (b, s, a) => ({ bin: "x-terminal-emulator", args: ["-e", b, s, ...a] }) },
      { check: "xterm",          build: (b, s, a) => ({ bin: "xterm",          args: ["-e", b, s, ...a] }) },
      { check: "urxvt",          build: (b, s, a) => ({ bin: "urxvt",          args: ["-e", b, s, ...a] }) },
      { check: "tilix",          build: (b, s, a) => ({ bin: "tilix",          args: ["-e", [b, s, ...a].join(" ")] }) },
      { check: "xfce4-terminal", build: (b, s, a) => ({ bin: "xfce4-terminal", args: ["--command", [b, s, ...a].join(" ")] }) },
      { check: "lxterminal",     build: (b, s, a) => ({ bin: "lxterminal",     args: ["-e", [b, s, ...a].join(" ")] }) },
    ]

    const envTerm = process.env.TERMINAL
    if (envTerm) {
      candidates.unshift({
        check: envTerm,
        build: (b, s, a) => ({ bin: envTerm, args: ["-e", b, s, ...a] }),
      })
    }

    for (const candidate of candidates) {
      const probe = spawnSync("which", [candidate.check], { stdio: "pipe" })
      if (probe.status === 0) {
        const { bin, args } = candidate.build(bunBin, script, scriptArgs)
        spawn(bin, args, { detached: true, stdio: "ignore" }).unref()
        return true
      }
    }

    return false
  }

  return false
}

export const AsciiDrawPlugin: Plugin = async ({ serverUrl, client }) => ({
  tool: {
    draw_ascii: tool({
      description:
        "Open an interactive ASCII drawing canvas in a new terminal window. The user can left-click and drag to place # characters. Press Enter to insert the art into the prompt as a code block. Press ESC to cancel.",
      args: {
        width: tool.schema.number().optional().describe("Canvas width in characters (default: 60)"),
        height: tool.schema.number().optional().describe("Canvas height in rows (default: 20)"),
      },
      execute: async (args) => {
        // process.execPath is the opencode binary, not bun — resolve via Bun.which
        const bunGlobal = globalThis.Bun as { which?: (name: string) => string | null } | undefined
        const bunBin = bunGlobal?.which?.("bun") ?? "bun"
        const w = String(args.width ?? 60)
        const h = String(args.height ?? 20)

        // Normalize host: server may bind to 0.0.0.0, which is not valid for client connections
        const parsedUrl = new URL(serverUrl.toString())
        parsedUrl.hostname = "127.0.0.1"
        // Write URL to temp file — avoids shell mangling of "://" in CLI args (Windows Terminal issue)
        const urlFile = path.join(tmpdir(), "opencode-ascii-draw-url.txt")
        writeFileSync(urlFile, parsedUrl.toString(), "utf-8")
        const ok = launchCanvas(bunBin, canvasScript, urlFile, w, h)
        if (!ok) {
          return "No terminal emulator found. Install gnome-terminal, xterm, kitty, or another supported terminal."
        }

        await client.tui.showToast({
          body: {
            message: `Drawing canvas opened (${w}×${h}). Left-click drag to draw #. Enter=Insert, ESC=Cancel.`,
            variant: "success",
          },
        })

        return `ASCII drawing canvas launched (${w}×${h}).\n- Left-click and drag to draw #\n- Press Enter to insert the drawing into the prompt\n- Press ESC or Ctrl+C to cancel`
      },
    }),
  },
})
