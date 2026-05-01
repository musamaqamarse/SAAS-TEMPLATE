# Changesets

This folder is managed by [`@changesets/cli`](https://github.com/changesets/changesets). Run `pnpm changeset` to record a version bump for the next release.

Each change in a PR that affects users should ship with a changeset describing the bump (`patch` / `minor` / `major`) and a one-line summary that goes into the changelog.

## Common commands

- `pnpm changeset` — interactively create a new changeset.
- `pnpm version-packages` — apply pending changesets, bump versions, regenerate `CHANGELOG.md`.
- `pnpm release` — build and publish (CI uses this; do not run locally).

## What needs a changeset

- Any user-visible change (CLI behaviour, template output, schema).
- Any new or removed feature.

## What does not need a changeset

- Internal refactors with no behaviour change.
- Test-only changes.
- Docs and README updates.
