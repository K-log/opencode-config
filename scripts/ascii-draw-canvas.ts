import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
// Standalone Bun script — no exports (must not be discovered as an OpenCode plugin)

let serverUrl = "http://127.0.0.1:4096/"
let width = 60
let height = 20

const rawArgs = process.argv.slice(2)
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === "--url-file" && rawArgs[i + 1] !== undefined) {
    try { serverUrl = readFileSync(rawArgs[++i], "utf-8").trim() } catch { /* keep default */ }
  } else if (rawArgs[i] === "--server-url" && rawArgs[i + 1] !== undefined) {
    serverUrl = rawArgs[++i]
  } else if (rawArgs[i] === "--width" && rawArgs[i + 1] !== undefined) {
    const pw = parseInt(rawArgs[++i], 10)
    if (!isNaN(pw) && pw > 0) width = pw
  } else if (rawArgs[i] === "--height" && rawArgs[i + 1] !== undefined) {
    const ph = parseInt(rawArgs[++i], 10)
    if (!isNaN(ph) && ph > 0) height = ph
  }
}

const HEADER_ROWS = 2 // status bar row + top border row
// Canvas content starts at terminal row HEADER_ROWS + 1 (1-indexed), col 2 (1-indexed)

const canvas: string[][] = Array.from({ length: height }, () => Array(width).fill(" "))
let isConfirming = false // guard against double-confirm
let escTimer: ReturnType<typeof setTimeout> | null = null

function write(s: string): void {
  process.stdout.write(s)
}

function moveTo(row: number, col: number): void {
  write(`\x1b[${row};${col}H`)
}

function render(): void {
  write("\x1b[2J\x1b[H") // clear screen, cursor home
  write("\x1b[?25l")      // hide cursor
  write(`ASCII Draw (${width}×${height})  [Drag=Draw | Shift+Drag=Erase | Enter=Insert | Y=Copy | ESC=Cancel | C=Clear]\r\n`)
  write("┌" + "─".repeat(width) + "┐\r\n")
  for (let r = 0; r < height; r++) {
    write("│" + canvas[r].join("") + "│\r\n")
  }
  write("└" + "─".repeat(width) + "┘\r\n")
}

function renderCell(cy: number, cx: number): void {
  // Terminal row: cy + HEADER_ROWS + 1 (1-indexed), col: cx + 2 (1-indexed, accounting for left border)
  moveTo(cy + HEADER_ROWS + 1, cx + 2)
  write(canvas[cy][cx])
}

function drawAt(tx: number, ty: number): void {
  const cx = tx - 2                  // 0-indexed canvas col
  const cy = ty - (HEADER_ROWS + 1) // 0-indexed canvas row
  if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
    canvas[cy][cx] = "#"
    renderCell(cy, cx)
  }
}

function eraseAt(tx: number, ty: number): void {
  const cx = tx - 2
  const cy = ty - (HEADER_ROWS + 1)
  if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
    canvas[cy][cx] = " "
    renderCell(cy, cx)
  }
}

function canvasText(): string {
  return canvas.map(row => row.join("").trimEnd()).join("\n")
}

function copyToClipboard(text: string): boolean {
  if (process.platform === "win32") {
    const r = spawnSync("clip", [], { input: text, stdio: ["pipe", "ignore", "ignore"] })
    return r.status === 0
  }
  if (process.platform === "darwin") {
    const r = spawnSync("pbcopy", [], { input: text, stdio: ["pipe", "ignore", "ignore"] })
    return r.status === 0
  }
  // Linux: try wl-copy (Wayland), xclip, xsel
  for (const [cmd, args] of [
    ["wl-copy", [] as string[]],
    ["xclip", ["-selection", "clipboard"]],
    ["xsel", ["--clipboard", "--input"]],
  ] as [string, string[]][]) {
    const probe = spawnSync("which", [cmd], { stdio: "pipe" })
    if (probe.status === 0) {
      const r = spawnSync(cmd, args, { input: text, stdio: ["pipe", "ignore", "ignore"] })
      return r.status === 0
    }
  }
  return false
}

function showStatus(msg: string, ms = 1500): void {
  const row = height + HEADER_ROWS + 2
  moveTo(row, 1)
  write(msg)
  setTimeout(() => {
    moveTo(row, 1)
    write(" ".repeat(msg.length))
  }, ms)
}

function cleanup(): void {
  if (escTimer !== null) { clearTimeout(escTimer); escTimer = null }
  write("\x1b[?1002l") // disable button-event tracking
  write("\x1b[?1006l") // disable SGR mouse mode
  write("\x1b[?25h")   // show cursor
  write("\x1b[2J\x1b[H") // clear screen
  process.stdin.setRawMode(false)
  process.stdin.pause()
}

async function confirm(): Promise<void> {
  if (escTimer !== null) { clearTimeout(escTimer); escTimer = null }
  if (isConfirming) return
  isConfirming = true

  const hasContent = canvas.some(row => row.some(cell => cell !== " "))
  if (!hasContent) {
    cleanup()
    process.exit(0)
  }

  const text = canvasText()
  const body = "```\n" + text + "\n```"

  try {
    const res = await fetch(new URL("/tui/append-prompt", serverUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "\n" + body }),
    })
    if (!res.ok) {
      moveTo(height + HEADER_ROWS + 2, 1)
      write(`\x1b[31mFailed to insert (HTTP ${res.status}). Press any key to exit.\x1b[0m`)
      await new Promise<void>(resolve => process.stdin.once("data", () => resolve()))
    }
  } catch (err) {
    moveTo(height + HEADER_ROWS + 2, 1)
    const msg = err instanceof Error ? err.message : String(err)
    write(`\x1b[31mError: ${msg}. Press any key to exit.\x1b[0m`)
    await new Promise<void>(resolve => process.stdin.once("data", () => resolve()))
  }

  cleanup()
  process.exit(0)
}

// Parses a complete SGR mouse escape sequence.
// Input: the full raw string starting from \x1b
// Returns null if not a valid/complete SGR mouse sequence
function parseSgr(raw: string): { button: number; x: number; y: number; released: boolean } | null {
  const m = raw.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])/)
  if (!m) return null
  return {
    button: parseInt(m[1], 10),
    x: parseInt(m[2], 10),
    y: parseInt(m[3], 10),
    released: m[4] === "m",
  }
}

process.stdin.setRawMode(true)
process.stdin.resume()
process.stdin.setEncoding("binary")

write("\x1b[?1006h") // SGR mouse mode
write("\x1b[?1002h") // button-event tracking (only when button held)
render()

let buf = ""

process.stdin.on("data", (chunk: string) => {
  buf += chunk

  while (buf.length > 0) {
    // SGR mouse sequence: \x1b[<Pb;Px;PyM or \x1b[<Pb;Px;Pym
    if (buf.startsWith("\x1b[<")) {
      // Find the terminator M or m
      const end = buf.search(/[Mm]/)
      if (end === -1) break // incomplete sequence, wait for more data
      const seq = buf.slice(0, end + 1)
      buf = buf.slice(end + 1)
      const m = parseSgr(seq)
      if (m && !m.released && (m.button & 3) === 0) {
        // left button (press=0, drag=32); shift modifier sets bit 2 (value 4)
        if (m.button & 4) {
          eraseAt(m.x, m.y)
        } else {
          drawAt(m.x, m.y)
        }
      }
      continue
    }

    // ESC key (bare \x1b not followed by [<)
    if (buf[0] === "\x1b") {
      if (buf.length === 1) {
        // Could still be start of a sequence — use a small timeout
        buf = ""
        escTimer = setTimeout(() => {
          escTimer = null
          cleanup()
          process.exit(0)
        }, 50)
        break
      }
      // It's some other escape sequence (e.g. arrow keys) — discard it
      const seqEnd = buf.slice(1).search(/[A-Za-z~]/)
      buf = seqEnd === -1 ? "" : buf.slice(seqEnd + 2)
      continue
    }

    const ch = buf[0]
    buf = buf.slice(1)

    if (ch === "\r" || ch === "\n") {
      confirm() // intentionally not awaited — exits process when done
      return
    }

    if (ch === "\x03" || ch === "\x04") {
      // Ctrl+C / Ctrl+D
      cleanup()
      process.exit(0)
    }

    if (ch === "y" || ch === "Y") {
      const ok = copyToClipboard(canvasText())
      showStatus(ok ? "\x1b[32mCopied to clipboard!\x1b[0m" : "\x1b[31mClipboard unavailable.\x1b[0m")
    }

    if (ch === "c" || ch === "C") {
      for (let r = 0; r < height; r++) canvas[r].fill(" ")
      render()
    }
  }
})

process.on("SIGINT", () => {
  cleanup()
  process.exit(0)
})
