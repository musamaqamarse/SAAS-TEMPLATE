# @create-saas/web

The web UI for create-saas — a stateless Next.js app that wraps `@create-saas/core` and lets non-CLI users configure and download a scaffold.

## Local dev

```bash
# from the workspace root
pnpm install
pnpm --filter @create-saas/core build   # core must be built once for the web app to import it
pnpm --filter @create-saas/web dev      # http://localhost:3010
```

The web app reads `templates/` and `infra/` from the workspace root via Next.js's `outputFileTracingRoot` + `outputFileTracingIncludes`. No publishing or copying step is needed in dev.

## Routes

| Path | Purpose |
|---|---|
| `/` | Landing page |
| `/configure` | Multi-step configurator (PR-3) |
| `/recommend` | Stack recommender (PR-2) |
| `/api/health` | Reports template count — the prod smoke target |
| `/api/scaffold/preview` | Scaffold to tmpdir, return file tree (PR-3) |
| `/api/scaffold/zip` | Stream a `.zip` of the full scaffold (PR-4) |
| `/api/recommend` | Server mirror of the recommender for embeds (PR-2) |

No auth, no database — Phase 2 is fully stateless. Shareable URLs (#14) encode the config in the query string.
