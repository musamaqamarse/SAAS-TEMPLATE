# create-saas

The interactive CLI on top of [`@create-saas/core`](../core/). Adds prompts, flag parsing, the `doctor` command, optional telemetry, and post-scaffold side effects (`git init`, `gh repo create`). Also ships the lifecycle commands (`update`, `add`, `remove`, `generate`) that operate on an existing scaffold.

For the engine itself — invokable from any HTTP route, test harness, or future SDK — see `@create-saas/core`.

```sh
# Scaffold a new project
npx create-saas                                 # interactive
npx create-saas my-app --yes --backend fastapi --website nextjs

# Inside an existing scaffolded project (operate on cwd)
npx create-saas update                          # apply pending template migrations
npx create-saas update --dry-run                # preview the plan first
npx create-saas add adminpanel                  # bolt on a role
npx create-saas add website --variant nextjs    # required when a role has multiple variants
npx create-saas remove mobileapp --yes          # remove a role
npx create-saas generate route users            # backend route
npx create-saas generate component PriceTag --target my-app-website

# Misc
npx create-saas doctor                          # check toolchain
```

## Lifecycle commands

These run inside an existing project (the cwd must contain `saas.config.json`).

| Command | What it does |
| --- | --- |
| `update` | Walks each template's recorded version → current `_template.json` version, applying declarative migrations. Conflicts surface as `*.update-conflict` companion files; idempotent across reruns. `--dry-run` shows the plan; `--strict` makes conflicts fail the run. |
| `add <role>` | Adds an app folder for a role (`backend` / `website` / `adminpanel` / `mobileapp`). Reuses the same per-app scaffolding primitive `scaffold()` uses. `--variant <id>` is required for roles with multiple options. |
| `remove <role>` | Deletes the role's folder, updates `saas.config.json`, refreshes agent rules. Hand-edited `CLAUDE.md` / `agents.md` / `.cursorrules` get `.new` siblings instead of being clobbered. |
| `generate <unit> <name>` | Generates a `route` / `model` / `component` / `page` from the owning template's `generators/` folder. Use `--target <folder>` when multiple apps could host the unit. Refuses to overwrite existing files. |

See the [top-level README](../../README.md) for the full feature list, supported stacks, and stack-specific assumptions.
