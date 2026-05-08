# @create-saas/core

## 0.4.0

### Minor Changes

- c50df66: Phase 3 — lifecycle commands. Turn the tool from a one-shot scaffolder into a daily driver.

  - New CLI commands (operate on the cwd of an existing scaffolded project):

    - `update` — walks each template's recorded version → the current `_template.json` version, applying declarative migrations. Supports `--dry-run` (preview the plan) and `--strict` (treat conflicts as failure). Idempotent: a second `update` is a no-op.
    - `add <role> [--variant <id>]` — bolts on a new app (backend/website/adminpanel/mobileapp). Reuses the same per-app scaffolding primitive `scaffold()` uses. Variants are resolved automatically when only one is supported.
    - `remove <role>` — deletes the role's folder and updates `saas.config.json`. Refreshes `CLAUDE.md`/`agents.md`/`.cursorrules`; if the user has hand-edited them, writes `.new` siblings instead of overwriting.
    - `generate <unit> <name>` — emits a `route`/`model`/`component`/`page` from the owning template's `generators/` folder. Use `--target <folder>` when multiple apps could host the unit. Refuses to overwrite existing files.

  - New engine APIs (`@create-saas/core`):

    - `loadProject` / `loadSaasConfig` / `updateSaasConfig` — read + atomically mutate `saas.config.json`.
    - `scaffoldApp` — extracted per-app primitive, reused by `scaffold` and `add`.
    - `addApp` / `removeApp` / `updateProject` / `generateUnit` — each lifecycle command exposed as a pure-to-disk function (no prompts, no telemetry, no git).
    - Migration system: `loadMigrations`, `buildMigrationChain`, `applyMigration`. Five declarative ops: `addFile`, `deleteFile`, `renameFile`, `patchJson`, `replaceText`. Conflicts are collected and surfaced as `*.update-conflict` companion files; hard I/O failures throw.
    - Generators system: per-template `generators/<unit>.json` manifests with `.tmpl` source files. Reuses the existing placeholder pipeline so project + name transforms (`{name}` / `{name_kebab}` / `{name_snake}` / `{name_pascal}`) are consistent with scaffold-time substitution.

  - `saas.config.json` schema bumped to v2: each template entry gains `appliedMigrations: string[]` (so `update` is idempotent across reruns); root gains `agentRulesHash` (sha256 of the last-rendered `CLAUDE.md`, used to detect user edits before re-rendering). v1 files load unchanged — they're normalized in memory and re-saved as v2 on the first lifecycle command.

  - Per-template generator manifests shipped: FastAPI (route, model), Next.js API (route, model), Next.js website (component, page), React+Vite website (component), Next.js admin (component, page). Flutter generators deferred — needs a separate design pass.

  - The Phase 3 roadmap explicitly defers the `migrate` command (data-layer swap) until real demand emerges; not included in this release.

## 0.3.0

### Minor Changes

- 8656017: Phase 2 prep — convert the repo to a pnpm workspace.

  - `@create-saas/core` is now a standalone published package under `packages/core/` (was `src/core/`).
  - The `create-saas` CLI moves to `packages/cli/` and consumes the engine via `workspace:*`.
  - Templates and infra stay at the repo root and are read in place by both consumers.
  - Adds an optional `prerendered` flag to `_template.json`. When set, the engine copies a committed `_prerendered/` overlay instead of shelling out to a stack-specific tool (e.g. `flutter create`). Lets the upcoming web UI scaffold mobile apps without the Flutter SDK installed on the server.
  - No behavioural change to the public API of either package; existing scaffolds continue to work unchanged.
