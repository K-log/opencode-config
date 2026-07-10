---
description: Refresh the cost-based model tier mapping used by the orchestrator's build-cheap/build-mid/build-powerful subagents.
agent: build
---

Refresh `~/.config/opencode/cache/model-tiers.json` and the `model:` pin in
`agents/build-cheap.md`, `agents/build-mid.md`, and `agents/build-powerful.md`.
This is a manual-only operation — never run automatically by the orchestrator.

### Steps

1. Run `opencode auth list` to determine which providers are currently
   authenticated. Only consider models from those providers.
2. Run `opencode models <provider> --verbose --refresh` for each authenticated
   provider to get fresh pricing (the `cost.input` / `cost.output` fields).
3. Filter candidates to the recommended-family list from
   https://opencode.ai/docs/models (GPT-5.2, GPT-5.1 Codex, Claude Opus 4.5,
   Claude Sonnet 4.5, Minimax M2.1, Gemini 3 Pro) plus same-family siblings and
   version variants:
   - `gpt-5*` (including `-mini`, `-codex` variants)
   - `claude-opus*`, `claude-sonnet*`, `claude-haiku*`
   - `minimax-m2*`
   - `gemini-3*`
     Exclude everything else (e.g. `claude-fable`, `phi`, `llama`, `jamba`,
     `cohere`, `mistral`, `o1`/`o3`/`o4`) even if cheaper.
4. Sort the filtered candidates by `cost.input` ascending.
   - **cheap** = the cheapest candidate.
   - **mid** = the candidate closest to the median cost.
   - **powerful** = the newest/most capable candidate in the top cost bucket
     (prefer the latest release date among the highest-cost tier, not just
     the cheapest of that bucket).
5. Write the new mapping to `~/.config/opencode/cache/model-tiers.json` using
   this schema:
   ```json
   {
     "updated": "<ISO8601 timestamp>",
     "filter": "recommended-family (opencode.ai/docs/models), authenticated providers only",
     "tiers": {
       "cheap": { "model": "<provider/model>", "cost_input": <n>, "cost_output": <n> },
       "mid": { "model": "<provider/model>", "cost_input": <n>, "cost_output": <n> },
       "powerful": { "model": "<provider/model>", "cost_input": <n>, "cost_output": <n> }
     },
     "candidates_considered": ["<provider/model>", "..."]
   }
   ```
6. Update the `model:` frontmatter line in `agents/build-cheap.md`,
   `agents/build-mid.md`, and `agents/build-powerful.md` to match the new
   tier assignments.
7. Print a before/after diff of tier assignments (old model → new model, per
   tier) so the user can see what changed. If nothing changed, say so.
