import { describe, it, expect } from "vitest"
import { SECRET_PATTERNS } from "./secret-scanner"

function hasSecret(content: string): boolean {
  return SECRET_PATTERNS.some((p) => p.test(content))
}

describe("secret-scanner patterns", () => {
  // 1. AWS access key
  it("detects AWS access key", () => {
    expect(hasSecret("key=AKIAIOSFODNN7EXAMPLE")).toBe(true)
  })
  it("does not flag non-AWS key prefix", () => {
    expect(hasSecret("key=BKIAIOSFODNN7EXAMPLE")).toBe(false)
  })

  // 2. GitHub PAT
  it("detects GitHub PAT", () => {
    expect(hasSecret("token=ghp_" + "a".repeat(36))).toBe(true)
  })
  it("does not flag short ghp_ token", () => {
    expect(hasSecret("token=ghp_short")).toBe(false)
  })

  // 3. OpenAI secret key
  it("detects OpenAI secret key", () => {
    expect(hasSecret("sk-" + "a".repeat(48))).toBe(true)
  })
  it("does not flag short sk- value", () => {
    expect(hasSecret("sk-tooshort")).toBe(false)
  })

  // 4. PEM private key
  it("detects RSA PEM header", () => {
    expect(hasSecret("-----BEGIN RSA PRIVATE KEY-----")).toBe(true)
  })
  it("detects EC PEM header", () => {
    expect(hasSecret("-----BEGIN EC PRIVATE KEY-----")).toBe(true)
  })
  it("detects OPENSSH PEM header", () => {
    expect(hasSecret("-----BEGIN OPENSSH PRIVATE KEY-----")).toBe(true)
  })
  it("does not flag public key header", () => {
    expect(hasSecret("-----BEGIN PUBLIC KEY-----")).toBe(false)
  })

  // 5. JWT
  it("detects JWT", () => {
    expect(hasSecret("abc123def456ghi789jkl.eyJhbGciOiJIUzI1NiJ9.abc123")).toBe(true)
  })
  it("does not flag plain dot-separated text", () => {
    expect(hasSecret("foo.bar.baz")).toBe(false)
  })

  // 6. Anthropic key
  it("detects Anthropic key", () => {
    expect(hasSecret("sk-ant-" + "a".repeat(40))).toBe(true)
  })
  it("does not flag short sk-ant- value", () => {
    expect(hasSecret("sk-ant-short")).toBe(false)
  })

  // 7. Slack token
  it("detects Slack bot token", () => {
    expect(hasSecret("xoxb-1234567890-abcdefghij")).toBe(true)
  })
  it("does not flag xox without valid suffix", () => {
    expect(hasSecret("xoxz-123")).toBe(false)
  })

  // 8. Stripe live secret
  it("detects Stripe live secret key", () => {
    expect(hasSecret("sk_live_" + "a".repeat(24))).toBe(true)
  })
  it("does not flag Stripe test key", () => {
    expect(hasSecret("sk_test_" + "a".repeat(24))).toBe(false)
  })

  // 9. Stripe restricted key
  it("detects Stripe restricted live key", () => {
    expect(hasSecret("rk_live_" + "a".repeat(24))).toBe(true)
  })
  it("does not flag Stripe restricted test key", () => {
    expect(hasSecret("rk_test_" + "a".repeat(24))).toBe(false)
  })

  // 10. npm token
  it("detects npm token", () => {
    expect(hasSecret("npm_" + "a".repeat(36))).toBe(true)
  })
  it("does not flag short npm_ value", () => {
    expect(hasSecret("npm_short")).toBe(false)
  })

  // 11. GCP service account
  it("detects GCP service account JSON field", () => {
    expect(hasSecret('"type": "service_account"')).toBe(true)
  })
  it("does not flag unrelated type field", () => {
    expect(hasSecret('"type": "user"')).toBe(false)
  })

  // benign content
  it("does not flag clean content", () => {
    expect(hasSecret("const x = 42")).toBe(false)
  })
})
