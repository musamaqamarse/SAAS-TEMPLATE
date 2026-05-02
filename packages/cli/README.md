# create-saas

The interactive CLI on top of [`@create-saas/core`](../core/). Adds prompts, flag parsing, the `doctor` command, optional telemetry, and post-scaffold side effects (`git init`, `gh repo create`).

For the engine itself — invokable from any HTTP route, test harness, or future SDK — see `@create-saas/core`.

```sh
npx create-saas             # interactive scaffold
npx create-saas --yes my-app --backend fastapi --website nextjs
npx create-saas doctor      # check toolchain
```

See the [top-level README](../../README.md) for the full feature list, supported stacks, and stack-specific assumptions.
