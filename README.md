# Tab Manager

Firefox extension to manage, search, organize, and clean up browser tabs.

## Features

- **List all tabs** across all windows in one view
- **Search** tabs by title or URL
- **Move tabs** within and across windows with drag and drop
- **Remove duplicates** — close all duplicate tabs (same URL)
- **Discard loaded tabs** — unload tabs to free memory
- **Remove AI tabs** — close tabs matching known AI URLs (ChatGPT, Claude, Duck.ai, Gemini)

## Build from Source

### Requirements

| Dependency | Version |
|------------|---------|
| **Operating System** | Linux, macOS, or Windows |
| **Bun** | 1.x (tested with 1.3.14) |
| **Node.js** | 18+ (required by Bun for some npm-compat features) |

Bun installs Node.js-compatible tooling automatically. If you only have
Node.js/npm, you can substitute `bun` with `npm` in the commands below
(though Bun is the primary package manager for this project).

### Step-by-step

1. **Install Bun** (if not already installed):

   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

   See [bun.sh](https://bun.sh) for alternative installation methods.

2. **Clone or extract the source** to a directory.

3. **Install dependencies:**

   ```bash
   bun install
   ```

4. **Build the extension:**

   ```bash
   bun run build:firefox
   ```

   This runs `wxt build -b firefox`, which compiles TypeScript/JSX sources
   via Vite and outputs the extension to `.output/firefox-mv2/`.

5. **Create the distribution archive:**

   ```bash
   bun run zip:firefox
   ```

   This runs `wxt zip -b firefox`, producing:
   - `.output/tab-manager-<version>-firefox.zip` — signed extension package
   - `.output/tab-manager-<version>-sources.zip` — source archive (this one)

The build output is deterministic from the source in this archive;
no minification or obfuscation is applied beyond standard bundling.

### npm alternative

If you prefer npm over Bun:

```bash
npm install
npm run build:firefox
npm run zip:firefox
```

### Build scripts (`package.json`)

| Script | Command | Description |
|--------|---------|-------------|
| `build:firefox` | `wxt build -b firefox` | Compile TS/JSX and bundle for Firefox |
| `zip:firefox` | `wxt zip -b firefox` | Package the build into a `.zip` |

### Verifying the build

To check the extension for lint warnings:

```bash
bunx web-ext lint -s .output/firefox-mv2
```

## Temporary Installation (for testing)

1. Open `about:debugging` in Firefox
2. Click "Load Temporary Add-on"
3. Select `.output/firefox-mv2/manifest.json`

## Layout
This extension uses CSS grid masonry layout, which requires Firefox 77+.

From version 77, users must explicitly enable the masonry layout:

1. Open `about:config` in Firefox
2. Search for `layout.css.grid-template-masonry-value.enabled`
3. Set to `true`
## License

MIT
