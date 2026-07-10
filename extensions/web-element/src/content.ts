import { generateSelector } from "./lib/selector"
import type { ElementCapture } from "./lib/types"

const api: any = (globalThis as any).browser ?? (globalThis as any).chrome

if ((window as any).__webElementPickerLoaded) {
  // already injected once this page load — do nothing on re-injection,
  // the existing listener set (if any) is still attached and functional
} else {
  (window as any).__webElementPickerLoaded = true

  const COMPUTED_STYLE_KEYS = [
    "display",
    "position",
    "color",
    "backgroundColor",
    "font",
    "fontSize",
    "fontWeight",
    "width",
    "height",
    "margin",
    "padding",
    "border",
    "boxSizing",
    "textAlign",
  ] as const

  let isPicking = false
  let overlay: HTMLDivElement | null = null

  function createOverlay(): HTMLDivElement {
    const div = document.createElement("div")
    div.style.cssText =
      "position: fixed; pointer-events: none; z-index: 2147483647; outline: 2px solid #4f9dff; outline-offset: -2px; background: rgba(79,157,255,0.15); transition: none;"
    document.body.appendChild(div)
    return div
  }

  function handleMouseMove(event: MouseEvent): void {
    if (!overlay) return
    const target = event.target
    if (target === overlay || !(target instanceof Element)) return

    const rect = target.getBoundingClientRect()
    overlay.style.left = `${rect.left}px`
    overlay.style.top = `${rect.top}px`
    overlay.style.width = `${rect.width}px`
    overlay.style.height = `${rect.height}px`
  }

  function buildCapture(target: Element): ElementCapture {
    const computed = getComputedStyle(target) as unknown as Record<string, string>
    const styles: Record<string, string> = {}
    for (const key of COMPUTED_STYLE_KEYS) {
      styles[key] = computed[key] ?? ""
    }

    const r = target.getBoundingClientRect()

    return {
      selector: generateSelector(target),
      outerHtml: target.outerHTML.slice(0, 5000),
      textContent: (target.textContent ?? "").slice(0, 2000),
      styles,
      rect: {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        devicePixelRatio: window.devicePixelRatio,
      },
      pageUrl: location.href,
      pageTitle: document.title,
    }
  }

  async function handleClick(event: MouseEvent): Promise<void> {
    const target = event.target
    if (!(target instanceof Element) || target === overlay) return

    event.preventDefault()
    event.stopPropagation()

    const payload = buildCapture(target)
    try {
      const result = await api.runtime.sendMessage({ type: "ELEMENT_CAPTURED", payload })
      if (!result?.ok) console.error("[web-element] capture failed:", result?.error ?? "unknown error")
    } catch (err) {
      console.error("[web-element] capture failed:", err)
    } finally {
      stopPicking()
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") stopPicking()
  }

  function stopPicking(): void {
    if (!isPicking) return
    isPicking = false

    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("click", handleClick, { capture: true })
    document.removeEventListener("keydown", handleKeyDown)

    overlay?.remove()
    overlay = null
  }

  function startPicking(): void {
    if (isPicking) return
    isPicking = true

    overlay = createOverlay()

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("click", handleClick, { capture: true })
    document.addEventListener("keydown", handleKeyDown)
  }

  api.runtime.onMessage.addListener((message: any) => {
    if (message?.type === "START_PICKER") {
      startPicking()
    }
  })
}
