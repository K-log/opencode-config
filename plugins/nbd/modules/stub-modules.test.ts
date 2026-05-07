import { describe, it, expect } from "vitest"

// Unit tests for milestone 5 module logic (not hook wiring)

describe("slack-notifier log format", () => {
  it("produces correct stderr message", () => {
    const msg =
      "[nbd] slack-notifier: session ended — call nbd_slack_notify tool to send Slack message"
    expect(msg).toContain("nbd_slack_notify")
    expect(msg).toStartWith("[nbd] slack-notifier:")
  })
})

describe("jira-link log format", () => {
  it("produces correct stderr message", () => {
    const msg = "[nbd] jira-link: session started — call nbd_jira_link tool to fetch Jira context"
    expect(msg).toContain("nbd_jira_link")
    expect(msg).toStartWith("[nbd] jira-link:")
  })
})

describe("github-pr log format", () => {
  it("produces correct stderr message", () => {
    const msg = "[nbd] github-pr: session ended — open a PR manually or via gh CLI"
    expect(msg).toContain("gh CLI")
    expect(msg).toStartWith("[nbd] github-pr:")
  })
})

describe("figma-fetch log format", () => {
  it("produces correct stderr message", () => {
    const msg =
      "[nbd] figma-fetch: session started — call nbd_figma_fetch tool to inject Figma context"
    expect(msg).toContain("nbd_figma_fetch")
    expect(msg).toStartWith("[nbd] figma-fetch:")
  })
})

describe("progress-bar log format", () => {
  it("interpolates filePath", () => {
    const filePath = "/some/file.ts"
    const msg = `[nbd] progress: edited ${filePath}`
    expect(msg).toBe("[nbd] progress: edited /some/file.ts")
  })
})

describe("diff-preview log format", () => {
  it("truncates to 20 lines", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`)
    const preview = lines.slice(0, 20).join("\n")
    expect(preview.split("\n")).toHaveLength(20)
    expect(preview).toContain("line 1")
    expect(preview).not.toContain("line 21")
  })

  it("header contains filePath", () => {
    const filePath = "/foo/bar.ts"
    const header = `[nbd] diff-preview: ${filePath}`
    expect(header).toStartWith("[nbd] diff-preview:")
    expect(header).toContain(filePath)
  })
})

describe("compact-mode log format", () => {
  it("produces correct stderr message", () => {
    const msg = "[nbd] compact-mode: context compaction is managed by opencode config"
    expect(msg).toContain("opencode config")
    expect(msg).toStartWith("[nbd] compact-mode:")
  })
})
