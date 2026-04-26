# Custom OpenCode Config

Personal OpenCode configuration for development workflow automation. Stored on GitHub for personal use and to share with others who may find it useful.

## Features

- Custom build command with Claude Sonnet 4.6
- Interactive code review workflow
- Planning agents (feature analysis, research, tests)
- MCP integrations: Figma, Jira, Playwright
- Markdown formatter with Prettier
- Token compaction and batch tool enabled

## Installation

Back up any existing config, then clone this repo into `~/.config/opencode`.

### Git

```bash
mv ~/.config/opencode ~/.config/opencode-bak
git clone git@github.com:K-log/opencode-config.git ~/.config/opencode
```

### GitHub CLI

```bash
mv ~/.config/opencode ~/.config/opencode-bak
gh repo clone K-log/opencode-config ~/.config/opencode
```

## Requirements

- Node.js 18+
- Bun

## Customization

Edit `opencode.json` to configure agents, MCP servers, and permissions for your workflow.
