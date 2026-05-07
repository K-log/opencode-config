import { describe, it, expect } from "vitest"

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /sk-[a-zA-Z0-9]{48}/,
  /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/,
]

function hasSecret(content: string): boolean {
  return SECRET_PATTERNS.some((p) => p.test(content))
}

describe("secret-scanner patterns", () => {
  it("detects AWS access key", () => {
    expect(hasSecret("key=AKIAIOSFODNN7EXAMPLE123")).toBe(true)
  })

  it("detects GitHub PAT", () => {
    expect(hasSecret("token=ghp_" + "a".repeat(36))).toBe(true)
  })

  it("detects OpenAI key", () => {
    expect(hasSecret("sk-" + "a".repeat(48))).toBe(true)
  })

  it("detects private key header", () => {
    expect(hasSecret("-----BEGIN RSA PRIVATE KEY-----")).toBe(true)
  })

  it("does not flag clean content", () => {
    expect(hasSecret("const x = 42")).toBe(false)
  })
})
