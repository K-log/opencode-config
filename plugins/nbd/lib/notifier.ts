import { $ } from "bun"

const MAX_LEN = 200

function sanitize(s: string): string {
  // strip control characters, cap length
  return s.replace(/[\x00-\x1f\x7f]/g, "").slice(0, MAX_LEN)
}

export async function notify(title: string, body: string): Promise<void> {
  const t = sanitize(title)
  const b = sanitize(body)
  const script = `display notification ${JSON.stringify(b)} with title ${JSON.stringify(t)}`
  await $`osascript -e ${script}`
}
