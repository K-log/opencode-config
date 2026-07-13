# Plan: web-element-picker -- Browser element picker referenced in opencode chat as @web-element-N

## Context

Build an opencode plugin that lets a user select a DOM element in a Chrome or Firefox browser tab and reference it in an opencode chat, similar to Cursor's "select element" feature. Selected elements appear as `@web-element-<count>` tokens (count increments per opencode session). A bundled browser extension (Chrome + Firefox, Manifest V3, no external npm deps, built with Bun) captures the element (unique CSS selector, truncated outerHTML, computed style subset, bounding rect, page URL/title, innerText, cropped screenshot) and posts it to a local HTTP bridge the plugin runs. Because multiple opencode instances/sessions may be running, the extension discovers all local bridges by scanning a bounded port range and lets the user pick the target session from a popup dropdown before capturing.

## Research Findings

- **Plugin discovery is non-recursive**: opencode's loader (`packages/opencode/src/config/plugin.ts`) globs `{plugin,plugins}/*.{ts,js}` — single `*`, `nodir: true`. A plugin MUST be a single flat file directly inside `plugins/`; subdirectories are silently invisible to the loader. Confirmed against core source.
- **No "active/focused session" API exists** anywhere in `@opencode-ai/sdk` (checked local cache and latest published `1.17.18`). `client.session.list()` and `client.session.status()` give session metadata/idle-busy-retry state, but nothing indicates which session is currently displayed in a TUI. Mitigation: the plugin approximates a "last-active session" heuristic by tracking the most recent sessionID seen across all `event` hook invocations (session.status, session.idle, message.updated, session.updated), and labels this "last active" (not "active") in the extension UI.
- **`FilePartInput` image parts require a `data:` URL.** Core (`packages/opencode/src/image/image.ts`) throws `InvalidDataUrlError` for any non-`data:` image URL. The plugin cannot pass an `http(s)://` screenshot URL — the extension must base64-encode the cropped screenshot into a `data:image/png;base64,...` URL before POSTing it to the plugin.
- **`client.tui.appendPrompt({ body: { text } })`** (POST `/tui/append-prompt`) injects text into the active TUI prompt. **`client.tui.showToast({ body: { message, variant, title?, duration? } })`** shows a toast. Both confirmed against `@opencode-ai/sdk` types and used exactly this way in `plugins/ascii-draw.ts:142-149`.
- **`chat.message` hook** signature: `(input: { sessionID, agent?, model?, messageID?, variant? }, output: { message: UserMessage, parts: Part[] }) => Promise<void>`. Mutating `output.parts` in place is the injection point for synthetic context — push a `TextPartInput`-shaped object with `synthetic: true` plus an optional `FilePartInput` (`{ type: "file", mime: "image/png", filename, url: <data-url> }`) for the screenshot.
- **Bun.serve inside a plugin**: no reserved port convention exists in the ecosystem; real-world plugins (`octto`, `plannotator`) run their own `Bun.serve()` fine. Since the browser extension must _discover_ the bridge by scanning (no filesystem access from a browser extension), the plugin binds the first free port in a fixed range `45123-45150` (sequential bind attempts) rather than an OS-random port.
- **Manifest V3 cross-browser**: a single `manifest.json` works for both browsers if `background` declares BOTH `scripts` (array) and `service_worker` (same file) — Chrome (>=121) uses `service_worker` and ignores `scripts`; Firefox (>=121) uses `scripts` as a non-persistent event page and ignores `service_worker`. No validation errors from either browser for the unrecognized key.
- **`host_permissions: ["http://127.0.0.1/*"]`** covers all ports on that host — match-pattern grammar has no port component, so no need to enumerate 45123-45150 individually.
- **`activeTab` permission is sufficient** for `tabs.captureVisibleTab` in both Chrome and Firefox (>=126; today's date is long past that). No need for `<all_urls>` or the `"tabs"` permission.
- **CORS/PNA**: extension `host_permissions` bypass CORS entirely for background-service-worker fetches (no `Access-Control-Allow-Origin` required for the fetch to succeed), but the bridge should send permissive CORS headers anyway as defense-in-depth (also useful if popup/content scripts ever fetch it directly). Chrome's Private Network Access preflight enforcement is on hold industry-wide; include `Access-Control-Allow-Private-Network: true` as a no-cost hedge.
- **Cropping the screenshot**: `chrome.tabs.captureVisibleTab` captures the visible viewport at `devicePixelRatio` resolution. The content script must report `devicePixelRatio` alongside the element's `getBoundingClientRect()` (viewport-relative) so the background service worker can scale the crop rect correctly: `fetch(dataUrl) -> blob() -> createImageBitmap() -> new OffscreenCanvas(w,h) -> ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh) -> convertToBlob() -> manual base64 encode` (no `FileReader` in a service worker).
- **No official unique-CSS-selector library is vendored** (avoiding new deps per user request) — hand-roll a compact selector generator inspired by `@medv/finder`'s approach: prefer `#id` if unique, else walk ancestors building a `tag:nth-child(n)` path, verified via `document.querySelectorAll(path).length === 1`.
- **Overlay pattern**: a single `position: fixed; pointer-events: none` div synced to `getBoundingClientRect()` on `mousemove`/`scroll` (React DevTools' approach) guarantees the overlay itself is never `event.target` — no extra "ignore my own overlay" filtering logic needed.
- **Programmatic content-script injection** (via `chrome.scripting.executeScript` triggered from the popup's "Pick Element" button) is preferred over a static always-on `content_scripts` entry — matches Chrome's own recommendation for on-demand picker UIs and avoids injecting on every page load.

## Codebase Conventions

- Existing plugins (`plugins/ascii-draw.ts`, `plugins/notification.ts`) are single flat files directly in `plugins/`, kebab-case filenames, exported const named `<Feature>Plugin` typed as `Plugin`, no semicolons, double quotes, 2-space indent, type-only imports split from value imports, Node builtins imported with `node:` prefix.
- Per-session state uses module-scope `Map<string, T>` keyed by `sessionID` (`plugins/notification.ts:96-99`), populated/cleared via the `event` hook reacting to `session.created/updated/deleted`.
- Event payloads are loosely typed; handlers use inline type assertions, e.g. `(event as { type: string; properties: { info: Session } }).properties` (`plugins/notification.ts:144` and others), rather than importing exhaustive SDK event types.
- Error handling is best-effort/non-throwing: OS/network side effects wrapped in `try {} catch { /* best-effort */ }`; functions that can fail return `boolean` rather than throwing.
- No formatter/linter is configured in this repo (`opencode.json`'s `formatter` block only covers `.md`/`.mdx` via Prettier) — style must be replicated by hand from existing files.
- Local `plugins/*.ts` files are NEVER added to `opencode.json`'s `plugin` array (that array is reserved for published npm plugins) — auto-discovery handles them.
- No test files, no test framework, no lint/typecheck script exist anywhere in this repo (`package.json` has no `scripts` field, no `tsconfig.json`/`.eslintrc*`/`biome.json`). Phase 6 validation will run an ad-hoc `bunx tsc --noEmit` against `plugins/web-element.ts` only (sensible default flags: `target esnext, module esnext, moduleResolution bundler, strict true`), and separately validate the extension via its own `bun build` (which will surface TS errors) — no repo-wide tsconfig will be added.
- Commit style (from `git log`): all-lowercase, imperative present tense, no trailing punctuation, no conventional-commit prefixes, no ticket prefixes (matches `AGENTS.md`).
- User decision: the browser extension is authored in TypeScript and built via Bun's built-in bundler (`bun build`, zero new npm dependencies), output emitted to a gitignored `dist/` directory. The extension lives in a new **top-level** folder `extensions/web-element/` (separate from `plugins/`, which must stay flat per the non-recursive plugin loader).

## Milestones

### Milestone 1: Plugin bridge core

Create `plugins/web-element.ts` (new, single flat file). Implements the local HTTP bridge (port-range bind, `/info`, `/select`, CORS/OPTIONS), per-session element storage, the "last-active session" heuristic, and TUI feedback (`appendPrompt` + `showToast`). No chat injection yet (that's Milestone 2) — this milestone is independently testable via `curl`.

#### Implementation Steps

**Phase 1 (sequential, single new file):**

- Step 1: Create `plugins/web-element.ts` skeleton following `plugins/notification.ts` / `plugins/ascii-draw.ts` conventions exactly: type-only import `import type { Plugin } from "@opencode-ai/plugin"`, no semicolons, double quotes, 2-space indent, exported const `export const WebElementPlugin: Plugin = async ({ client, project }) => ({ ... })`.

**Phase 2 (parallel — independent regions of the same file, author in any order within the single pass):**

- Step 2: Define types near the top of the file: `type ElementCapture = { selector: string; outerHtml: string; textContent: string; styles: Record<string, string>; rect: { x: number; y: number; width: number; height: number; devicePixelRatio: number }; pageUrl: string; pageTitle: string; screenshotDataUrl?: string }`. Module-scope `const elementsBySession = new Map<string, ElementCapture[]>()`.
- Step 3: Module-scope `let lastActiveSessionID: string | undefined`. Inside the `event` hook (to be wired in Phase 4), update it whenever an event payload carries a `sessionID`/`properties.info.id` — mirror `plugins/notification.ts:143-160`'s inline type-assertion pattern for `session.status`, `session.idle`, `message.updated`, `session.updated` events.
- Step 4: Implement port-scan + `Bun.serve`: a function `startBridge()` that tries ports `45123` through `45150` sequentially (`for` loop, `try { const server = Bun.serve({ port, fetch: handleFetch }); return server } catch { continue }`), returns the bound `Server` (or `undefined` if the whole range is exhausted — log nothing that pollutes TUI, just give up silently). Store the returned server handle in a module-scope variable for later cleanup.

**Phase 3 (depends on Phase 2):**

- Step 5: Implement `handleFetch(req: Request): Response | Promise<Response>` with routes:
  - `OPTIONS` (any path) -> `204` with headers `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`, `Access-Control-Allow-Private-Network: true`.
  - `GET /info` -> JSON `{ port, project: project.worktree ?? project.id, lastActiveSessionID, sessions: (await client.session.list()).data?.map(s => ({ id: s.id, title: s.title })) ?? [] }`, same CORS headers plus `Access-Control-Allow-Origin: *`.
  - `POST /select` -> parse JSON body `{ sessionID: string; element: ElementCapture }`; if `sessionID` missing, `400`; else push `element` onto `elementsBySession.get(sessionID) ?? []` (creating the array if absent), `count = array.length`; best-effort `try { await client.tui.appendPrompt({ body: { text: \`@web-element-${count} \` } }) } catch {}`; best-effort `try { await client.tui.showToast({ body: { message: \`Captured element as @web-element-${count}\`, variant: "success" } }) } catch {}`; respond `200`JSON`{ ok: true, count }` with CORS headers.
  - Any other path -> `404`.
- Step 6: Implement `dispose` hook body: `server?.stop()` (references the Phase 2 Step 4 server handle).

**Phase 4 (depends on Phase 3):**

- Step 7: Wire `event` (Step 3's body) and `dispose` (Step 6's body) into the object returned by the `WebElementPlugin` factory. Call `startBridge()` once, synchronously, when the factory runs (before returning the hooks object). Do not register a `tool` key in this milestone.

Manual test: start opencode, `curl http://127.0.0.1:<bound-port>/info` returns a JSON session list; `curl -X POST http://127.0.0.1:<port>/select -H "Content-Type: application/json" -d '{"sessionID":"<real-session-id>","element":{"selector":"div","outerHtml":"<div>hi</div>","textContent":"hi","styles":{},"rect":{"x":0,"y":0,"width":10,"height":10,"devicePixelRatio":1},"pageUrl":"https://example.com","pageTitle":"Example"}}'` appends `@web-element-1 ` to the TUI prompt and shows a success toast.

### Milestone 2: chat.message injection

Edit `plugins/web-element.ts` to add the `chat.message` hook, resolving `@web-element-N` tokens in outgoing messages into synthetic context parts (text + optional screenshot). Builds directly on Milestone 1's `elementsBySession` map.

#### Implementation Steps

**Phase 1 (parallel):**

- Step 1: Add a `"chat.message"` hook entry to the `WebElementPlugin` factory's returned object (shell only: `async (input, output) => { ... }`).
- Step 5: Write manual-verification notes as a code comment above the hook (no automated tests for this project): "send a chat message containing @web-element-1 after a capture exists; confirm the session transcript includes the injected context block".

**Phase 2 (depends on Phase 1 Step 1):**

- Step 2: Inside the hook, scan `output.parts` for parts where `part.type === "text"`, matching `/@web-element-(\d+)/g` against `part.text` to collect referenced indices `N`.

**Phase 3 (depends on Phase 2):**

- Step 3: For each matched `N`, look up `elementsBySession.get(input.sessionID)?.[N - 1]`. Guard against duplicate injection on hook re-invocation for the same message using a module-scope `const injectedMessageIDs = new Set<string>()` keyed by `input.messageID` — skip if already present, otherwise add it after injecting.

**Phase 4 (depends on Phase 3):**

- Step 4: For each resolved record, push onto `output.parts`: (a) a text part `{ type: "text", text: <fenced context block: selector, pageUrl, pageTitle, rect, styles as key:value lines, outerHtml in a \`\`\`html fence, textContent>, synthetic: true }`; (b) if `record.screenshotDataUrl`is set, a file part`{ type: "file", mime: "image/png", filename: \`web-element-${N}.png\`, url: record.screenshotDataUrl }`.

Manual test: with a captured element in `elementsBySession` for the active session, send a chat message containing `@web-element-1` and confirm (via TUI or `client.session.messages`) that the model received the injected context block (and image, if a screenshot was present and the model supports vision).

### Milestone 3: Browser extension core (manifest, build tooling, discovery, popup, picker capture)

Create the new top-level `extensions/web-element/` directory: a Manifest V3 extension (Chrome + Firefox) authored in TypeScript, built via `bun build` (no new npm dependencies), with a popup session-picker, on-demand picker injection, and element capture (selector + HTML + styles + rect + text — screenshot deferred to Milestone 4).

#### Implementation Steps

**Phase 1 (parallel — no cross-file dependencies):**

- Step a: `extensions/web-element/manifest.json` — MV3; `background: { scripts: ["background.js"], service_worker: "background.js" }`; `action: { default_popup: "popup.html" }`; `permissions: ["activeTab", "scripting", "storage"]`; `host_permissions: ["http://127.0.0.1/*"]`; `browser_specific_settings: { gecko: { id: "web-element@opencode.local" } }`; icons block referencing `icons/icon-16.png`, `icon-48.png`, `icon-128.png`. Manifest points at built files in `dist/` (e.g. `dist/background.js`, `dist/popup.js`) — confirm paths match the build output step below.
- Step b: `extensions/web-element/package.json` — `{ "name": "web-element-extension", "private": true, "scripts": { "build": "bun build ./src/background.ts ./src/content.ts ./src/popup.ts --outdir dist --target browser --format iife" } }`, no `dependencies`/`devDependencies`.
- Step c: `extensions/web-element/.gitignore` — single line `dist/`.
- Step d: `extensions/web-element/src/lib/types.ts` — shared TS types: `ElementCapture` (mirror Milestone 1's shape exactly, plus `screenshotDataUrl?: string`), `InstanceInfo` (`{ port: number; project: string; lastActiveSessionID?: string; sessions: SessionSummary[] }`), `SessionSummary` (`{ id: string; title: string }`).
- Step e: `extensions/web-element/src/lib/selector.ts` — `export function generateSelector(el: Element): string` — if `el.id` and `document.querySelectorAll(\`#${CSS.escape(el.id)}\`).length === 1` return `#${el.id}`; else walk up from `el`building a path of`tag:nth-child(n)`segments (computed via the element's index among its parent's children) until`document.querySelectorAll(path.join(" > "))`yields exactly one match or`documentElement` is reached; cap walk depth at 10 ancestors.
- Step i: `extensions/web-element/icons/icon-16.png`, `icon-48.png`, `icon-128.png` — simple solid-color placeholder PNGs (generate via any available method; visually simple is fine, this is a placeholder).

**Phase 2 (depends on Phase 1 Step d, and for content.ts also Step e):**

- Step f: `extensions/web-element/src/background.ts` — `const api = (globalThis as any).browser ?? (globalThis as any).chrome`. Message router (via `api.runtime.onMessage.addListener`): `type: "DISCOVER"` scans ports `45123`-`45150` with `fetch(\`http://127.0.0.1:${port}/info\`, { signal: AbortSignal.timeout(250) })`, collects successful responses into `InstanceInfo[]`, returns them to the caller; `type: "INJECT_PICKER"`(payload`{ tabId, port, sessionID }`) calls `api.scripting.executeScript({ target: { tabId }, files: ["content.js"] })`then`api.tabs.sendMessage(tabId, { type: "START_PICKER" })`, and stashes `{ port, sessionID }`in module scope keyed by`tabId`for routing the eventual capture;`type: "ELEMENT_CAPTURED"`(sent from the content script, payload is`ElementCapture`minus screenshot) looks up the stashed`{ port, sessionID }`for the sending tab and`POST`s `{ sessionID, element }`to`http://127.0.0.1:${port}/select`.
- Step g: `extensions/web-element/src/content.ts` — on receiving `START_PICKER`: create a `position: fixed; pointer-events: none; z-index: 2147483647` overlay div; on `mousemove`, update overlay position/size to `event.target`'s (excluding the overlay itself, which can't be targeted due to `pointer-events: none`) `getBoundingClientRect()`; on `click` (while picker active), `preventDefault()`/`stopPropagation()`, build an `ElementCapture` using `generateSelector(target)`, `target.outerHTML.slice(0, 5000)`, `target.textContent?.slice(0, 2000) ?? ""`, a computed-style subset (pick keys: `display, position, color, backgroundColor, font, fontSize, fontWeight, width, height, margin, padding, border, boxSizing, textAlign` via `getComputedStyle(target)`), `rect: { ...target.getBoundingClientRect(), devicePixelRatio: window.devicePixelRatio }`, `pageUrl: location.href`, `pageTitle: document.title`; send via `api.runtime.sendMessage({ type: "ELEMENT_CAPTURED", payload })`; remove the overlay and all listeners after one capture; `Escape` key cancels and removes listeners/overlay without capturing.
- Step h: `extensions/web-element/src/popup.html` + `extensions/web-element/src/popup.ts` — on `DOMContentLoaded`, send `{ type: "DISCOVER" }` to the background, render a `<select>` with `<optgroup>` per discovered instance (label = `InstanceInfo.project`) and an `<option>` per session (label = session title, value = `port|sessionID`), pre-selecting the option matching the first instance's `lastActiveSessionID` if present; a "Pick Element" `<button>` that queries the active tab (`api.tabs.query({ active: true, currentWindow: true })`), sends `{ type: "INJECT_PICKER", tabId, port, sessionID }` (parsed from the selected option's value) to the background, then calls `window.close()`.

Manual test: run `bun run build` in `extensions/web-element/`, load unpacked in Chrome (`chrome://extensions` -> Developer mode -> Load unpacked -> select `extensions/web-element`) and as a temporary add-on in Firefox (`about:debugging#/runtime/this-firefox` -> Load Temporary Add-on -> select `extensions/web-element/manifest.json`), open the popup, confirm the running opencode session(s) appear in the dropdown, click "Pick Element", hover/click a DOM element on any page, confirm `@web-element-1` appears in the opencode TUI prompt and a success toast is shown (screenshot not yet included — that's Milestone 4).

### Milestone 4: Screenshot capture + crop + docs

Add screenshot capture and cropping to the extension's capture pipeline, and write install documentation. Builds directly on Milestone 3's `background.ts` and the already-captured `devicePixelRatio`/rect data from `content.ts` (no `content.ts` changes needed in this milestone).

#### Implementation Steps

**Phase 1 (parallel):**

- Step 1: In `extensions/web-element/src/background.ts`'s `ELEMENT_CAPTURED` handler, before constructing the `/select` POST body, call `const dataUrl = await api.tabs.captureVisibleTab(windowId, { format: "png" })` (Promise form — omit any callback argument; `windowId` obtained via `api.windows.getCurrent()` or from the sender tab's `windowId`).
- Step 4: Write `extensions/web-element/README.md`: Chrome install (`bun run build` then `chrome://extensions` -> Developer mode -> Load unpacked -> select `extensions/web-element`), Firefox install (`bun run build` then `about:debugging#/runtime/this-firefox` -> Load Temporary Add-on -> select `manifest.json`; note temporary add-ons are removed on Firefox restart), note the bridge uses ports `45123-45150` (must have at least one free), note `@web-element-N` numbering is per opencode session, note screenshots require a vision-capable model to be useful to the LLM.

**Phase 2 (depends on Phase 1 Step 1):**

- Step 2: Crop the `dataUrl` to the element's rect scaled by `devicePixelRatio`: `const blob = await (await fetch(dataUrl)).blob(); const bitmap = await createImageBitmap(blob); const sx = rect.x * rect.devicePixelRatio, sy = rect.y * rect.devicePixelRatio, sw = rect.width * rect.devicePixelRatio, sh = rect.height * rect.devicePixelRatio; const canvas = new OffscreenCanvas(sw, sh); const ctx = canvas.getContext("2d")!; ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh); const croppedBlob = await canvas.convertToBlob({ type: "image/png" })`. Base64-encode `croppedBlob` via `const buf = await croppedBlob.arrayBuffer()` + a small manual `arrayBufferToBase64(buf)` helper (no `FileReader` in a service worker) into `data:image/png;base64,<...>`.

**Phase 3 (depends on Phase 2):**

- Step 3: Attach the resulting data URL as `element.screenshotDataUrl` before POSTing to `/select`. Wrap the entire capture-then-crop sequence in `try/catch` — on failure (permission errors, non-capturable pages like `chrome://`), POST the capture without `screenshotDataUrl` and show a non-blocking warning (e.g. via a `chrome.notifications` call or by relaying a toast-worthy message back to the popup) rather than failing the whole capture.

Manual test: repeat Milestone 3's manual test; confirm the captured element now includes a cropped screenshot, and (with a vision-capable model configured) confirm the injected image part is visible to the model in the chat.

## Post-Implementation

1. Run `bunx tsc --noEmit` against `plugins/web-element.ts` with flags `--target esnext --module esnext --moduleResolution bundler --strict` (ad-hoc, no repo tsconfig exists).
2. Run `bun run build` inside `extensions/web-element/` to confirm the extension's TypeScript compiles cleanly via Bun's bundler.
3. Invoke the `review-code` subagent to review all changes across both `plugins/web-element.ts` and `extensions/web-element/`.
4. Address any Critical Issues from the review (Improvements/Nitpicks may be skipped).
5. Display a summary of changes for the user.
