# Forge Workspace

A `conversation.view` tab (`forge`, order 20, after Chat and Trajectory) in the DeepSeek Harness Web GUI: a blank canvas of draggable, resizable, closable **windowed plugin instances** for multi-agent coding sessions.

## What it provides

- **Terminal windows** — real PTYs (node-pty) over WebSocket at host route `/forge/terminal`; spawn `bash`, `claude`, or any agent CLI. One toolbar button each for Terminal and Claude.
- **Vault graph windows** — the shared `VaultGraphView` primitive (also used by the sidebar's memory-vault overlay, which opens the notes/wikilinks graph from the sidebar footer) rendered as a window on the canvas. Data: host route `/api-vault/graph` rooted at this workspace's `memory/`.
- Window layout and terminal sessions are stored in **module-level registries** (`packages/client/ui-forge`), because the `conversation.view` slot unmounts inactive tabs — this keeps agents running across tab switches.

## Implementation notes (durable gotchas)

- Client plugin discovery = **nested `dsh.client`** block in package.json (`{ "dsh": { "client": { "inject": [package names], "platform": "web" } } }`) plus `exports["./client"]` → `lib/client.js`. Roster row goes in `packages/bundle/web-app/cordis.patch.yml` and the package must be a web-app dependency.
- The shell shares platform statics (react, ui-primitives, …) via `packages/client/web/src/seed.ts`; plugin bundles may require only those plus other client plugins' `./client` entries.
- Client bundle CSS pipeline inlines only `*.module.css`; global stylesheets (xterm.css) must be vendored as a JS string and injected at runtime.
- Host routes and roster changes need a `dsh web` **restart**; client bundle bytes are served per-request (page refresh suffices for pure UI changes).
- `/forge/terminal` is **loopback-only by Host header** regardless of bind — it spawns shells.
- A view that owns its geometry (canvas/ledger, not a document) must put `data-conversation-composer-overlay` on its root; ConversationRoot then pins the viewArea to a definite flex height and overlays the composer (TrajectoryView pattern). Without it the viewArea is content-sized and `height: 100%` collapses.
- `pnpm run dev:web` is broken on Node 22 (ERR_INVALID_RETURN_PROPERTY_VALUE); use full `build:lib:host` / `build:lib:client` / `build:web`.

Related: [[Parallel Coding-Agent Orchestration Landscape]], [[Cross-Agent Collaboration MCP]]
