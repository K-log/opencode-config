#!/usr/bin/env node
// PostToolUse hook: run prettier on markdown files after Edit/Write.
// Ported from the opencode `formatter.prettier-markdown` config
// (opencode.json), which ran `npx -y prettier --write $FILE` on .md/.mdx.

import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

let input = {}
try {
  input = JSON.parse(readFileSync(0, "utf-8"))
} catch {
  process.exit(0)
}

const filePath = input?.tool_input?.file_path
if (
  typeof filePath === "string" &&
  /\.(md|mdx)$/i.test(filePath) &&
  existsSync(filePath)
) {
  spawnSync("npx", ["-y", "prettier", "--write", filePath], {
    stdio: "ignore",
    env: { ...process.env, NODE_ENV: "production" },
  })
}

process.exit(0)
