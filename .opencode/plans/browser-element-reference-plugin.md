# Plan: browser-element-reference-plugin -- Browser element reference plugin

## Context

Build an opencode plugin that lets a user select an element from a browser webpage and reference it in chat, like a file reference or Cursor's web element select.

Resolved product decisions:
- MVP inserts text-only Markdown into chat prompt; no screenshots, no file persistence, no auto-submit.
- Inserted reference label: `@browser-element`.
- Browser support: Chrome + Firefox via single unpacked WebExtension.
- Selection trigger: browser extension action/button.
- Bridge config: extension options page with bridge URL/token copied from plugin display/log output.
- Port behavior: attempt `127.0.0.1:7982`, increment until free, display/log actual bridge URL.
- Token lifecycle: ephemeral per plugin start.
- Payload caps: visibleText 32 KiB, outerHTML 64 KiB, selector/url 2 KiB, title/name/role 1 KiB.
- Server runtime: `Bun.serve`.
- Extension assets include simple generated icons.
- Cross-origin/protected frames: best-effort failure with clear user-facing limitation.
- Inert HTML prompt marking: note plus fenced `html` block.

## Research Findings

- `@opencode-ai/plugin@1.17.18` and `@opencode-ai/sdk@1.17.18` are installed locally.
- Server plugins can use `Plugin`, plugin input `client`, `serverUrl`, and lifecycle hooks. Existing local plugin discovery loads `plugins/*.ts`.
- Prompt append should prefer `client.tui.appendPrompt({ body: { text } })`; fallback can POST `{ text }` to `new URL("/tui/append-prompt", serverUrl)`.
- Opencode references are local/git oriented; no custom browser DOM reference source exists. MVP should insert Markdown text into prompt.
- Recommended architecture: browser action click -> inject content picker -> extract element metadata/text/outerHTML -> background POSTs to localhost plugin bridge -> plugin validates token/schema -> formats Markdown -> appends prompt text.
- Chrome/Firefox WebExtension should use `activeTab`, `scripting`, `storage`, action button, localhost host permissions, `browser.*`/`chrome.*` compatibility.
- Security constraints: bind localhost only, require token, cap payloads, treat HTML as inert text, avoid persistence, avoid screenshots, reject/limit cross-origin protected frames.

## Codebase Conventions

- Plugin location: `plugins/*.ts`; add `plugins/browser-element-reference.ts`.
- Follow `plugins/ascii-draw.ts`: `import type { Plugin } from "@opencode-ai/plugin"`, named PascalCase export, ESM, 2-space indent, double quotes, no semicolons.
- Keep extension files outside `plugins/`, under `extensions/browser-element-reference/`, to avoid plugin auto-discovery.
- Use `client.tui.showToast({ body: { message, variant } })` pattern for user feedback where useful.
- Existing script `scripts/ascii-draw-canvas.ts` demonstrates fallback POST to `/tui/append-prompt` with `{ text }`.
- No package scripts, tsconfig, ESLint/Prettier config, or tests are currently configured.

## Milestones

### Milestone 1: Server plugin localhost bridge

Add opencode server plugin at `plugins/browser-element-reference.ts` that starts a localhost bridge, exposes actual bridge URL/token, validates extension POSTs, formats captures, and appends `@browser-element` Markdown to chat prompt.

#### Implementation Steps

Phase 1 (parallel):
- Add plugin skeleton `plugins/browser-element-reference.ts` with `BrowserElementReferencePlugin: Plugin`, ESM imports, and style matching `plugins/ascii-draw.ts`.
- Implement `Bun.serve` lifecycle skeleton with start/stop hooks, `GET /health`, and `OPTIONS` preflight support.
- Implement prompt formatting helper that emits `@browser-element`, metadata, selector, fenced visible text, inert note, and fenced `html` outerHTML block.
- Implement validation constants and schema helpers for visibleText 32 KiB, outerHTML 64 KiB, selector/url 2 KiB, title/name/role 1 KiB.

Phase 2 (parallel, after Phase 1):
- Implement `POST /element` handler with body read limit enforcement.
- Implement auth and request validation: `Authorization: Bearer <token>` or `x-opencode-browser-element-token`, method/path/content-type checks, CORS/preflight response.
- Implement append logic: try `client.tui.appendPrompt({ body: { text } })`, fallback to `fetch(new URL("/tui/append-prompt", serverUrl), { body: JSON.stringify({ text }) })` if needed.

Phase 3 (parallel, after Phase 2):
- Implement port bind loop starting at `7982`, incrementing until free; generate ephemeral per-start token; display/log actual bridge URL and token.
- Implement JSON success/error responses and toast/log messages for capture success and validation failures.
- Implement graceful dispose/unload to stop `Bun.serve` and free bound port.

### Milestone 2: WebExtension element picker

Add unpacked Chrome+Firefox-compatible WebExtension under `extensions/browser-element-reference` that lets user configure bridge URL/token, click action button, select an element, and POST capture to plugin.

#### Implementation Steps

Phase 1 (parallel):
- Add `extensions/browser-element-reference/manifest.json` with MV3 metadata, `activeTab`, `scripting`, `storage`, localhost host permissions, action button, options page, gecko metadata, and icon fields.
- Add simple generated icon assets: `icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png`.
- Add `picker-content.css` overlay/highlight styles.

Phase 2 (parallel, after manifest exists):
- Add `picker-content.js` with overlay/highlight, click capture, deterministic CSS selector builder, visible text extraction, accessibility metadata, bounding rect capture, outerHTML cap trimming, Escape cancel, cleanup, and cross-origin/protected frame error reporting.
- Add `options.html` and `options.js` for saving bridge URL/token in extension storage, default URL `http://127.0.0.1:7982`, and guidance to use plugin-displayed actual bridge URL.
- Add `background.js` skeleton with `browser.*`/`chrome.*` compatibility wrapper, `action.onClicked`, script/CSS injection, storage read, and graceful missing-config handling.

Phase 3 (parallel, after Phase 2):
- Implement background POST client to send capture to `/element` with token header, handle CORS errors, connection refused, 401 token mismatch, and transient failures; show/log actionable status.
- Implement restricted-page injection failure handling and user-facing messages linking to options and explaining protected page/cross-origin limitations.

### Milestone 3: Documentation and validation guidance

Add concise docs for installing/enabling plugin and extension, configuring bridge URL/token, using picker, privacy limits, and manual validation.

#### Implementation Steps

Phase 1 (parallel):
- Add `extensions/browser-element-reference/README.md` describing plugin restart, ephemeral token, actual bridge URL display, Chrome load-unpacked, Firefox temporary add-on, and use flow.
- Document payload caps, privacy/security model, no screenshots/no persistence, ephemeral token model, cross-origin/protected-frame limitation, and inert HTML marking policy.

Phase 2 (parallel, after Phase 1 and behavior implemented):
- Add manual test checklist covering port bind fallback, token auth failures, CORS/preflight, append fallback, restricted-page injection, and no auto-submit/no screenshots.
- Add troubleshooting for port conflicts, opencode prompt append failures, extension permission/injection failures, and copying plugin-displayed actual bridge URL into extension options.

## Post-Implementation

1. Run the project linter and type-checker, if tooling exists or can be run ad hoc.
2. Run tests relevant to changed code; repository currently has no configured test runner.
3. Invoke the `code-reviewer` subagent to review all changes.
4. Address any critical or improvement issues from the review.
5. Display a summary of changes for the user.

## Test Plan

### Manual Testing

1. Install unpacked extension in Chrome and Firefox from `extensions/browser-element-reference`; confirm toolbar icon appears.
2. Start/restart opencode so plugin loads; capture displayed/logged bridge URL and ephemeral token.
3. Enter bridge URL/token in extension options; if port `7982` was occupied, use actual incremented URL shown by plugin.
4. Open a normal webpage and opencode chat; click extension action and select a visible element.
5. Confirm opencode prompt receives appended Markdown, not auto-submitted, containing `@browser-element`, URL, title, tag/role/name, selector, visible text, inert note, and fenced `html` block.
6. Confirm no screenshot capture and no persistent files are created.
7. Test token mismatch by restarting plugin or changing token; selection should fail with visible/logged auth error and no silent prompt append.
8. Test restricted/protected page and cross-origin iframe selection; extension should show clear limitation/error and not append misleading data.
9. Test large element; visible text and outerHTML should be truncated/capped and marked accordingly.

### Automated Tests

Repository has no test runner configured. Recommended future tests:
- Unit tests for Markdown formatter and size caps, using Vitest.
- Unit/jsdom tests for selector builder, visible text extraction, outerHTML bounding, and cross-origin/protected-frame error behavior.
- Integration tests for bridge auth, CORS/preflight, port increment from `7982`, valid/invalid payload handling, and append fallback.
- Playwright E2E tests for Chromium and Firefox loading the unpacked extension, selecting elements, token rotation failure, port conflict behavior, and cross-origin iframe limitation.

Ad hoc validation commands if tooling is available:
- `npx vitest run tests/plugins/browser-element-markdown.unit.ts`
- `npx vitest run tests/plugins/bridge-server.integration.ts`
- `npx playwright test tests/e2e/browser-element-reference.spec.ts --project=chromium`
- `npx playwright test tests/e2e/browser-element-reference.spec.ts --project=firefox`

### Custom Test Agents

Detected:
- `agents/plan-feature-tests.md`
- `agents/check-regressions.md`
- `agents/review-code.md`
- `agents/debug.md`

Use `check-regressions` after implementation to scope changed-file tests and coverage gaps. Use `review-code` for lint/type/test smoke checks. Use `debug` if verification fails.
