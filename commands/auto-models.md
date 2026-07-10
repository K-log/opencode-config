---
description: Enable or disable dynamic cost-tier model selection for the orchestrate agent.
agent: build
---

Arguments: `$ARGUMENTS`

- Parse the first positional argument. It must be exactly `enable` or
  `disable`. If missing or anything else, report usage and stop:
  ```
  Usage: /auto-models <enable|disable>
  ```
- Write `~/.config/opencode/cache/auto-models.json`, replacing any existing
  content, with this schema:
  ```json
  {
    "enabled": <true|false>,
    "updated": "<ISO8601 timestamp>"
  }
  ```
- Report the new setting to the user:
  - `enable`: "Auto model selection enabled. The orchestrate agent will load
    the model-tiers skill, read `model-tiers.json`, and tag implementation
    steps with cost tiers (cheap/mid/powerful) for every workflow run from now
    on, until disabled."
  - `disable`: "Auto model selection disabled. The orchestrate agent will skip
    tiering entirely and delegate every build step at the default
    (`build-mid`) tier for every workflow run from now on, until enabled."
- This setting persists until changed by another `/auto-models` command. It
  does not read or modify `model-tiers.json` itself — that mapping is only
  refreshed by `/update-model-tiers`.
