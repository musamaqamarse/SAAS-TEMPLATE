# create-saas

## 0.2.0

### Minor Changes

- 96303dd: Phase 1 — decouple the engine.

  - Extract `src/core/` as the headless scaffolding engine (`scaffold(config, options)`). The CLI is now a thin layer on top; a future web UI / SDK can call the same function.
  - `ScaffoldConfig` is the single typed boundary between every consumer and the engine; validation happens at the boundary via Zod.
  - Add non-interactive CLI: `--config <path>` to load a JSON `ScaffoldConfig`, plus per-field flags (`--data-stack`, `--backend`, `--website`, `--admin`, `--mobile`, `--bundle-vendor`, `--description`, `--out`, `--no-infra`, `--no-git`, `--create-github-repos`, `--public`) and `--yes` to skip prompts entirely. Unblocks CI and AI agents.
  - Every scaffolded project now writes `saas.config.json` at the root, recording the composition, project identity, CLI version, and the exact template versions used. This is the contract the future `update`/`add`/`remove` commands will read from.
  - Pre-shipped `CLAUDE.md`, `agents.md`, and `.cursorrules` per scaffold, tuned to the chosen stack combination (apps, ports, env vars, auth model, conventions). AI coding tools work well from minute one.
  - Bump every shipped template to `version: 1.0.0` in `_template.json` so `saas.config.json` records meaningful versions.
  - Bump CI to `actions/checkout@v5` and `actions/setup-node@v5` (Node-24-native), opt remaining Node-20 actions into the Node-24 runtime via `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`, and run on Node 22 to clear the September 2026 Node-20 deprecation.

## 0.1.0

Initial public scaffolder. Generates backend (FastAPI / Next.js API), website (Next.js / React+Vite), admin panel (Next.js), and mobile (Flutter) starters wired to Supabase or Firebase. Optional infra folder, optional git init, optional GitHub repo creation via `gh`.
