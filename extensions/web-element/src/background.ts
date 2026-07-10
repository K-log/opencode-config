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

// No FileReader in a service worker — manually base64-encode the blob's
// bytes via btoa (available in MV3 service workers).
async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)
  return `data:${blob.type};base64,${base64}`
}

async function forwardCapture(
  tabId: number | undefined,
  windowId: number | undefined,
  payload: ElementCapture,
): Promise<{ ok: boolean; error?: string }> {
  if (tabId === undefined) return { ok: false, error: "no sender tab" }

  const stored = await api.storage.session.get(`pending:${tabId}`)
  const pending = stored[`pending:${tabId}`]
  if (!pending) return { ok: false, error: "no pending picker session for tab" }

  try {
    const dataUrl = await api.tabs.captureVisibleTab(windowId, { format: "png" })
    const blob = await (await fetch(dataUrl)).blob()
    const bitmap = await createImageBitmap(blob)
    const sx = payload.rect.x * payload.rect.devicePixelRatio
    const sy = payload.rect.y * payload.rect.devicePixelRatio
    const sw = payload.rect.width * payload.rect.devicePixelRatio
    const sh = payload.rect.height * payload.rect.devicePixelRatio
    const canvas = new OffscreenCanvas(sw, sh)
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("no 2d context")
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh)
    const croppedBlob = await canvas.convertToBlob({ type: "image/png" })
    const screenshotDataUrl = await blobToDataUrl(croppedBlob)
    if (screenshotDataUrl.length > 2_000_000) {
      console.warn("[web-element] screenshot exceeds size limit, omitting", screenshotDataUrl.length)
    } else {
      payload.screenshotDataUrl = screenshotDataUrl
    }
  } catch (err) {
    // best-effort — screenshot capture/crop can fail on restricted pages
    // (chrome://, etc.), rate limits, or lack of a 2d context; proceed
    // without a screenshot rather than failing the whole capture
    console.warn("[web-element] screenshot capture/crop failed, continuing without screenshot", err)
  }

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
    discoverInstances()
      .then((instances) => sendResponse({ instances }))
      .catch((err) => sendResponse({ instances: [], error: err instanceof Error ? err.message : String(err) }))
    return true
  }

  if (message?.type === "INJECT_PICKER") {
    injectPicker(message.tabId, message.port, message.sessionID)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }))
    return true
  }

  if (message?.type === "ELEMENT_CAPTURED") {
    forwardCapture(sender?.tab?.id, sender?.tab?.windowId, message.payload)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }))
    return true
  }

  return false
})
