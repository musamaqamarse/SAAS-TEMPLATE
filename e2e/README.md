# @create-saas/e2e

Playwright tests for the `apps/web` funnel. Verifies:

| Spec | Asserts |
|---|---|
| `health.spec.ts` | `/api/health` reports all 6 templates + 2 infra stacks (deploy-blocker) |
| `anonymous-zip.spec.ts` | Configurator → Download .zip arrives, has ZIP magic bytes, success card renders |
| `share-link.spec.ts` | "Copy share link" round-trips a non-default config |
| `recommender.spec.ts` | 6 questionnaire answers pre-fill the configurator |
| `exit-criterion.spec.ts` | Landing → ZIP download in under 3 minutes (the Phase 2 exit gate) |

## Local

```bash
pnpm --filter @create-saas/web build       # build once
pnpm --filter @create-saas/e2e install:browsers   # one-time, ~150MB
pnpm --filter @create-saas/e2e test
```

The Playwright `webServer` boots `apps/web` in production mode and tears it down on exit. Set `E2E_BASE_URL=https://...` to point the suite at a deployed preview instead.

## CI

`.github/workflows/e2e.yml` runs the suite on every PR. The exit-criterion spec failing blocks the merge.
