# @create-saas/core

Headless scaffolding engine behind [`create-saas`](../cli/) and the web UI under [`apps/web`](../../apps/web/). Pure I/O + events: no prompts, no git, no telemetry, no stdout. Safe to call from a CLI, an HTTP route handler, or any other consumer.

## Public API

```ts
import {
  scaffold,
  ScaffoldConfigSchema,
  type ScaffoldConfig,
  type ScaffoldOptions,
  type ScaffoldResult,
  type ScaffoldEvent,
} from "@create-saas/core";

const result = await scaffold(config, {
  templatesRoot: "/abs/path/to/templates",
  infraRoot: "/abs/path/to/infra",
  cliVersion: "0.2.0",
  onEvent: (e) => console.log(e),
});
```

The engine writes to `cfg.destDir` only. The single side effect outside that path is an optional `flutter create` shell-out when `mobile === "flutter"` and the template's `_template.json` does **not** declare `prerendered: true`.

See [`src/index.ts`](./src/index.ts) for the full export surface.
