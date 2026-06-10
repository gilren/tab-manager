# Tab Manager

Firefox extension to manage, search, organize, and clean up browser tabs.

## Features

- **List all tabs** across all windows in one view
- **Search** tabs by title or URL
- **Move tabs** within and across windows with drag and drop
- **Remove duplicates** — close all duplicate tabs (same URL)
- **Discard loaded tabs** — unload tabs to free memory
- **Remove AI tabs** — close tabs matching known AI URLs (ChatGPT, Claude, Duck.ai, Gemini)

## Installation

### From Source

```bash
bun install
bun run build
bun run zip:firefox
```

Load the extension in Firefox:
1. Open `about:debugging`
2. Click "Load Temporary Add-on"
3. Select `.output/tab-manager-0.0.0.zip` or `.output/firefox-mv2/manifest.json`

## Layout
This extension uses CSS grid masonry layout, which requires Firefox 77+.

From version 77, users must explicitly enable the masonry layout:

1. Open `about:config` in Firefox
2. Search for `layout.css.grid-template-masonry-value.enabled`
3. Set to `true`

## License

MIT
