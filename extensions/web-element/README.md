# web-element extension

Browser extension for opencode's `web-element` plugin. Select a DOM element in
the browser and reference it in an opencode chat as `@web-element-N`.

## Build

```
bun run build
```

Bundles the TypeScript sources in `src/` into `dist/background.js`,
`dist/content.js`, and `dist/popup.js`. Run this before loading the
extension, and again after any source change.

## Install

### Chrome

1. Go to `chrome://extensions`.
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select the `extensions/web-element` directory.

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on" and select
   `extensions/web-element/manifest.json`.

Firefox temporary add-ons are removed when Firefox restarts — reload via the
same steps each session.

## Usage

1. Click the extension icon to open the popup.
2. Select the target opencode session from the dropdown. Sessions are
   discovered automatically from any running opencode instance with the
   `web-element` plugin loaded, listening on a port in the `45123-45150`
   range.
3. Click "Pick Element".
4. Hover over any element on the page (highlighted with a blue outline) and
   click to capture it.

The captured element appears as `@web-element-N` in the opencode TUI prompt
for the selected session (`N` increments per session).

## Notes

- The local bridge only binds to `127.0.0.1` (not exposed to the network)
  and has no authentication — it is designed for local single-user
  development use only.
- `@web-element-N` numbering is per opencode session — the same element
  captured twice, or elements captured across different sessions, get
  independent counters.
- Screenshots are only useful to the LLM if the configured model supports
  image/vision input.
- Element picking is limited to the top-level document — elements inside
  `<iframe>`s are not currently reachable.
- Screenshots are capped at ~2MB (base64-encoded) — larger crops are
  automatically omitted (the rest of the capture still succeeds); check the
  extension's console (chrome://extensions -> service worker -> inspect) or
  the page's console for `[web-element]`-prefixed warnings if a capture
  seems incomplete.

## Development

`bun run build` rebuilds after any source change; reload the extension
(Chrome: click the reload icon on `chrome://extensions`; Firefox: reload the
temporary add-on) to pick up changes.
