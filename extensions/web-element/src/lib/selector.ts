// Generates a best-effort unique CSS selector for an element: prefers a
// unique #id, else walks up ancestors building a tag:nth-child(n) path
// until the path uniquely matches, documentElement is reached, or a depth
// cap is hit (whichever first) — never throws, returns the best path found.

export function generateSelector(el: Element): string {
  if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) {
    return `#${el.id}`
  }

  const segments: string[] = []
  let current: Element | null = el
  let depth = 0

  while (current && current !== document.documentElement && depth < 10) {
    const parentEl: Element | null = current.parentElement
    if (!parentEl) break

    const siblings = Array.from(parentEl.children)
    const index = siblings.indexOf(current) + 1
    const tagName = current.namespaceURI === "http://www.w3.org/1999/xhtml" ? current.tagName.toLowerCase() : current.tagName
    segments.unshift(`${tagName}:nth-child(${index})`)

    const path = segments.join(" > ")
    try {
      if (document.querySelectorAll(path).length === 1) {
        return path
      }
    } catch {
      // malformed path (shouldn't happen) — keep walking
    }

    current = parentEl
    depth++
  }

  return segments.join(" > ") || el.tagName.toLowerCase()
}
