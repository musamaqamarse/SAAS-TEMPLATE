# Contributing to create-saas

Thanks for considering a contribution. This project is in active development; the bar for merging is "doesn't break existing scaffolds and ships with a changeset".

## Local setup

```bash
pnpm install
pnpm doctor          # verify your toolchain
pnpm test            # watch-mode tests
pnpm test:run        # one-shot tests (CI parity)
pnpm validate:templates
pnpm dev my-test-app # try the CLI locally; output is gitignored under /_out, /scratch, etc.
```

You need:

- Node.js 20+
- pnpm 9.15+
- git

Optional, only needed if you touch the matching templates:

- Python 3.12+ (for the FastAPI backend template)
- Flutter 3.24+ (for the Flutter mobile template)
- GitHub CLI (`gh`) (for testing `--create-github-repos`)

## Project layout

```
src/                 CLI source (TypeScript)
templates/           Per-stack scaffolding templates (overlay model)
infra/               Supabase / Firebase infra starters
scripts/             Maintenance scripts (validate-templates, etc.)
tests/               Vitest unit + e2e tests
local_docs/          Personal planning notes (gitignored)
```

## How to add a new template

1. Create `templates/<role>-<name>/` with the standard layout:
   ```
   _template.json     metadata (validated by Zod schema in src/schemas.ts)
   _common/           files shared by every variant
   _supabase/         Supabase-specific overrides (if applicable)
   _firebase/         Firebase-specific overrides (if applicable)
   ```
2. The `_template.json` must declare `name`, `role`, `displayName`, `language`, `supports[]`, `folderSuffix`. Run `pnpm validate:templates` to confirm.
3. Wire the new template into `planApps()` in `src/scaffold.ts`.
4. Add it to the relevant prompt in `src/prompts.ts`.
5. Add at least one e2e test combination in `tests/scaffold.e2e.test.ts`.
6. Add a changeset (`pnpm changeset`) describing the addition.

## Pull request checklist

- [ ] `pnpm lint` passes (typecheck)
- [ ] `pnpm test:run` passes
- [ ] `pnpm validate:templates` passes
- [ ] If user-visible: a changeset is included (`pnpm changeset`)
- [ ] If a new placeholder token is used in templates: it is registered in `src/placeholders.ts`

## Telemetry

If you contribute features that interact with telemetry, remember:

- Telemetry is **opt-in only** — controlled by `CREATE_SAAS_TELEMETRY=1`.
- Never capture project names, file paths, env values, or anything that identifies a user.
- Keep the event schema small. New events go through review.

## Commit style

Conventional Commits encouraged but not enforced. The release workflow uses Changesets, not commit messages, to determine the version bump.

## Questions

Open a GitHub Discussion for design questions; open an Issue for bugs.
