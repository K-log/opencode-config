import type { ElementCapture, InstanceInfo } from "./lib/types"

// Cross-browser MV3 API shim — Firefox exposes the promise-based `browser`
// global, Chrome exposes the callback-based `chrome` global (which also
// supports promises for the APIs used here). Untyped since @types/chrome
// is not available (no new npm dependencies).
const api: any = (globalThis as any).browser ?? (globalThis as any).chrome

const PORT_RANGE_START = 45123
const PORT_RANGE_END = 45150

async function discoverInstances(): Promise<InstanceInfo[]> {
  const ports: number[] = []
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) ports.push(port)

  const results = await Promise.allSettled(
    ports.map(async (port) => {
      const res = await fetch(`http://127.0.0.1:${port}/info`, {
        signal: AbortSignal.timeout(250),
      })
      if (!res.ok) throw new Error(`bad status ${res.status}`)
      const info = (await res.json()) as InstanceInfo
      return { ...info, port: info.port ?? port }
    }),
  )

  const instances: InstanceInfo[] = []
  for (const result of results) {
    if (result.status === "fulfilled") instances.push(result.value)
  }
  return instances
}

async function injectPicker(tabId: number, port: number, sessionID: string): Promise<void> {
  await api.scripting.executeScript({ target: { tabId }, files: ["dist/content.js"] })
  await api.tabs.sendMessage(tabId, { type: "START_PICKER" })
  await api.storage.session.set({ [`pending:${tabId}`]: { port, sessionID } })
}

async function forwardCapture(tabId: number | undefined, payload: ElementCapture): Promise<{ ok: boolean; error?: string }> {
  if (tabId === undefined) return { ok: false, error: "no sender tab" }

  const stored = await api.storage.session.get(`pending:${tabId}`)
  const pending = stored[`pending:${tabId}`]
  if (!pending) return { ok: false, error: "no pending picker session for tab" }

  try {
    const res = await fetch(`http://127.0.0.1:${pending.port}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionID: pending.sessionID, element: payload }),
    })
    if (!res.ok) return { ok: false, error: `bridge responded ${res.status}` }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    await api.storage.session.remove(`pending:${tabId}`)
  }
}

api.runtime.onMessage.addListener((message: any, sender: any, sendResponse: (response: unknown) => void) => {
  if (sender?.id && sender.id !== api.runtime.id) return false

  if (message?.type === "DISCOVER") {
    discoverInstances().then((instances) => sendResponse({ instances }))
    return true
  }

  if (message?.type === "INJECT_PICKER") {
    injectPicker(message.tabId, message.port, message.sessionID)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }))
    return true
  }

  if (message?.type === "ELEMENT_CAPTURED") {
    forwardCapture(sender?.tab?.id, message.payload).then((result) => sendResponse(result))
    return true
  }

  return false
})
