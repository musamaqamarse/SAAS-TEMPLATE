---
"@create-saas/core": minor
"create-saas": minor
---

Phase 2 prep — convert the repo to a pnpm workspace.

- `@create-saas/core` is now a standalone published package under `packages/core/` (was `src/core/`).
- The `create-saas` CLI moves to `packages/cli/` and consumes the engine via `workspace:*`.
- Templates and infra stay at the repo root and are read in place by both consumers.
- Adds an optional `prerendered` flag to `_template.json`. When set, the engine copies a committed `_prerendered/` overlay instead of shelling out to a stack-specific tool (e.g. `flutter create`). Lets the upcoming web UI scaffold mobile apps without the Flutter SDK installed on the server.
- No behavioural change to the public API of either package; existing scaffolds continue to work unchanged.
