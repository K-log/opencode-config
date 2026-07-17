import type { Plugin } from "@opencode-ai/plugin"
import path from "node:path"

// Strip a leading `cd <dir> &&` from bash commands, but only when the target
// is redundant — i.e. it resolves to the same directory the command would
// already run in via `workdir`. Genuine navigation (cd to a different dir
// than workdir) is left untouched.

const CD_PREFIX = /^\s*cd\s+((?:"[^"]*")|(?:'[^']*')|(?:[^\s&]+))\s*&&\s*/

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

// Track rewrites by callID so tool.execute.after can annotate the output.
const rewrites = new Map<string, { original: string; workdir: string }>()

export const BashWorkdirPlugin: Plugin = async ({ directory }) => ({
  "tool.execute.before": async (input, output) => {
    if (input.tool !== "bash") return
    const args = output.args as { command?: string; workdir?: string }
    if (typeof args.command !== "string") return

    const original = args.command
    let command = args.command
    const cwd = args.workdir ? path.resolve(directory, args.workdir) : directory
    let strippedAny = false

    let match: RegExpMatchArray | null
    while ((match = command.match(CD_PREFIX))) {
      const target = path.resolve(cwd, stripQuotes(match[1]))
      if (target !== cwd) break // genuine navigation elsewhere — stop, leave untouched
      command = command.slice(match[0].length)
      strippedAny = true
    }

    if (!strippedAny) return

    args.command = command
    args.workdir = cwd
    rewrites.set(input.callID, { original, workdir: cwd })
  },

  "tool.execute.after": async (input, output) => {
    const rewrite = rewrites.get(input.callID)
    if (!rewrite) return
    rewrites.delete(input.callID)
    output.output = `[bash-workdir] stripped redundant "cd" -> workdir=${rewrite.workdir}\n\n${output.output}`
  },
})
