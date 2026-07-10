export type ElementCapture = {
  selector: string
  outerHtml: string
  textContent: string
  styles: Record<string, string>
  rect: { x: number; y: number; width: number; height: number; devicePixelRatio: number }
  pageUrl: string
  pageTitle: string
  screenshotDataUrl?: string
}

export type SessionSummary = { id: string; title: string }

export type InstanceInfo = {
  port: number
  project: string
  lastActiveSessionID?: string
  sessions: SessionSummary[]
}
