import type { Plugin } from "@opencode-ai/plugin"

// Browser element picker bridge: receives DOM element captures from the
// web-element browser extension over a local HTTP bridge and surfaces them
// in the opencode TUI as @web-element-<count> tokens. See
// .opencode/plans/web-element-picker.md for the full design.
//
// This file (Milestone 1) implements only the bridge itself — port-range
// bind, /info + /select routes, CORS/OPTIONS, per-session element storage,
// and the "last-active session" heuristic. Chat injection (resolving
// @web-element-N references into synthetic context parts) is Milestone 2.

type ElementCapture = {
  selector: string
  outerHtml: string
  textContent: string
  styles: Record<string, string>
  rect: {
    x: number
    y: number
    width: number
    height: number
    devicePixelRatio: number
  }
  pageUrl: string
  pageTitle: string
  screenshotDataUrl?: string
}

// Per-session captured elements. Index + 1 is the @web-element-N count
// referenced in chat.
const elementsBySession = new Map<string, ElementCapture[]>()

// No "active session" API exists in @opencode-ai/sdk — approximate by
// tracking the most recent sessionID seen across event hook invocations.
let lastActiveSessionID: string | undefined

// The extension has no filesystem access to discover the bridge, so it
// scans this fixed port range instead of relying on an OS-random port.
const PORT_RANGE_START = 45123
const PORT_RANGE_END = 45150

let server: ReturnType<typeof Bun.serve> | undefined

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Private-Network": "true",
  }
}

// Validates and sanitizes an untrusted /select request body's `element`
// field. Returns null (rather than throwing) for any shape violation so the
// caller can respond 400 — the bridge has no auth, so this is the only line
// of defense against a malicious/broken caller on localhost.
function validateElementCapture(input: unknown): ElementCapture | null {
  if (!input || typeof input !== "object") return null
  const el = input as Record<string, unknown>

  const requiredStrings = ["selector", "outerHtml", "textContent", "pageUrl", "pageTitle"] as const
  for (const key of requiredStrings) {
    if (typeof el[key] !== "string") return null
  }

  const styles: Record<string, string> = {}
  if (el.styles !== undefined) {
    if (typeof el.styles !== "object" || el.styles === null || Array.isArray(el.styles)) return null
    for (const [k, v] of Object.entries(el.styles as Record<string, unknown>)) {
      if (typeof v === "string") styles[k] = v
    }
  }

  if (!el.rect || typeof el.rect !== "object") return null
  const rect = el.rect as Record<string, unknown>
  const rectKeys = ["x", "y", "width", "height", "devicePixelRatio"] as const
  for (const key of rectKeys) {
    if (typeof rect[key] !== "number") return null
  }

  let screenshotDataUrl: string | undefined
  if (el.screenshotDataUrl !== undefined) {
    if (typeof el.screenshotDataUrl !== "string" || !el.screenshotDataUrl.startsWith("data:image/")) return null
    if (el.screenshotDataUrl.length > 2_000_000) return null
    screenshotDataUrl = el.screenshotDataUrl
  }

  return {
    selector: el.selector as string,
    outerHtml: (el.outerHtml as string).slice(0, 5000),
    textContent: (el.textContent as string).slice(0, 2000),
    styles,
    rect: {
      x: rect.x as number,
      y: rect.y as number,
      width: rect.width as number,
      height: rect.height as number,
      devicePixelRatio: rect.devicePixelRatio as number,
    },
    pageUrl: el.pageUrl as string,
    pageTitle: el.pageTitle as string,
    screenshotDataUrl,
  }
}

export const WebElementPlugin: Plugin = async ({ client, project }) => {
  async function handleFetch(req: Request): Promise<Response> {
    const url = new URL(req.url)

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    if (req.method === "GET" && url.pathname === "/info") {
      let sessions: { id: string; title: string }[] = []
      try {
        const result = await client.session.list()
        sessions = result.data?.map((s) => ({ id: s.id, title: s.title })) ?? []
      } catch {
        // best-effort — session list unavailable
      }

      return Response.json(
        {
          port: server?.port,
          project: project.worktree,
          lastActiveSessionID,
          sessions,
        },
        { headers: corsHeaders() },
      )
    }

    if (req.method === "POST" && url.pathname === "/select") {
      let body: { sessionID?: string; element?: unknown }
      try {
        body = await req.json()
      } catch {
        return new Response("Invalid JSON", { status: 400, headers: corsHeaders() })
      }

      if (!body.sessionID || !body.element) {
        return new Response("Missing sessionID or element", {
          status: 400,
          headers: corsHeaders(),
        })
      }

      const element = validateElementCapture(body.element)
      if (!element) {
        return new Response("Invalid element payload", {
          status: 400,
          headers: corsHeaders(),
        })
      }

      const existing = elementsBySession.get(body.sessionID) ?? []
      existing.push(element)
      elementsBySession.set(body.sessionID, existing)
      const count = existing.length

      try {
        await client.tui.appendPrompt({ body: { text: `@web-element-${count} ` } })
      } catch {
        // best-effort — TUI may be unavailable
      }

      try {
        await client.tui.showToast({
          body: {
            message: `Captured element as @web-element-${count}`,
            variant: "success",
          },
        })
      } catch {
        // best-effort — TUI may be unavailable
      }

      return Response.json({ ok: true, count }, { headers: corsHeaders() })
    }

    return new Response("Not found", { status: 404, headers: corsHeaders() })
  }

  function startBridge(): void {
    for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
      try {
        server = Bun.serve({ port, hostname: "127.0.0.1", fetch: handleFetch })
        return
      } catch {
        // port in use — try the next one
        continue
      }
    }
  }

  startBridge()

  return {
    event: async ({ event }) => {
      if (event.type === "session.status" || event.type === "session.idle") {
        const props = (event as { type: string; properties: { sessionID: string } }).properties
        if (props.sessionID) lastActiveSessionID = props.sessionID
      }

      if (event.type === "message.updated") {
        const info = (event as { type: string; properties: { info: { sessionID: string } } })
          .properties.info
        if (info?.sessionID) lastActiveSessionID = info.sessionID
      }

      if (event.type === "session.updated") {
        const info = (event as { type: string; properties: { info: { id: string } } })
          .properties.info
        if (info?.id) lastActiveSessionID = info.id
      }

      if (event.type === "session.deleted") {
        const info = (event as { type: string; properties: { info: { id: string } } })
          .properties.info
        if (info?.id) {
          elementsBySession.delete(info.id)
          if (lastActiveSessionID === info.id) lastActiveSessionID = undefined
        }
      }
    },
    dispose: async () => {
      try {
        server?.stop()
      } catch {
        // best-effort — never throw from dispose
      }
    },
  }
}
