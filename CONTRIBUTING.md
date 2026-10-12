# Contributing

This repository is **generated** from the full Forge toolkit by a build script. Pull requests that edit `agents/`, `commands/`, `skills/`, `templates/` or `codex/` directly will be overwritten on the next build.

- **Content changes** (an agent prompt, a workflow, a template): open an issue or PR describing the change; it will be applied upstream and regenerated.
- **Installer, plugin manifests, README, CI:** edit here directly (`bin/`, `.claude-plugin/`, `README.md`, `.github/`).

Before opening a PR run `node bin/forge-swe.mjs init` in an empty temp directory and confirm it completes.
