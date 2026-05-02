/**
 * Wraps `@create-saas/core`'s `scaffold()` for serverless / HTTP use. The
 * engine is pure I/O + events; this helper owns:
 *
 *   - Locating `templates/` and `infra/` at runtime (relative to apps/web,
 *     bundled into the function via `outputFileTracingIncludes`).
 *   - Allocating a temp dir for `cfg.destDir`.
 *   - Cleaning up the temp dir even on error.
 *
 * Used by /api/health (templates discovery), /api/scaffold/preview, and
 * /api/scaffold/zip.
 */
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import {
  scaffold,
  ScaffoldConfigSchema,
  type ScaffoldConfig,
  type ScaffoldOptions,
  type ScaffoldResult,
  type ScaffoldEvent,
} from "@create-saas/core";

export const WEB_VERSION = process.env.npm_package_version ?? "0.1.0";

/**
 * `process.cwd()` is `apps/web` in both `next dev` and on Vercel. Templates
 * and infra live at the workspace root, two directories up. The
 * `outputFileTracingRoot` + `outputFileTracingIncludes` config in
 * next.config.mjs ensures these paths are present in the deployed function.
 */
export function findTemplatesRoot(): string {
  return path.resolve(process.cwd(), "../..", "templates");
}

export function findInfraRoot(): string {
  return path.resolve(process.cwd(), "../..", "infra");
}

/**
 * Web-facing config shape: same as the engine's `ScaffoldConfig` minus the
 * CLI-only intent fields (initGit / createGithubRepos / githubVisibility /
 * destDir). The web never inits git or pushes to GitHub — that was descoped
 * from Phase 2 — and `destDir` is a server-controlled temp path.
 */
export const WebScaffoldConfigSchema = ScaffoldConfigSchema.omit({
  destDir: true,
  initGit: true,
  createGithubRepos: true,
  githubVisibility: true,
});
export type WebScaffoldConfig = ReturnType<typeof WebScaffoldConfigSchema.parse>;

export interface ScaffoldRunResult {
  result: ScaffoldResult;
  destDir: string;
  cleanup: () => Promise<void>;
}

/**
 * Run the engine into a freshly-allocated temp dir. Caller MUST `await
 * cleanup()` once it's finished streaming the response — preferably in a
 * `finally` block so an error during streaming doesn't leak the temp dir.
 */
export async function runScaffold(
  webConfig: WebScaffoldConfig,
  events?: (e: ScaffoldEvent) => void
): Promise<ScaffoldRunResult> {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), `cs-${randomUUID().slice(0, 8)}-`));
  const destDir = path.join(tmpRoot, webConfig.projectKebab);

  // Re-build a full ScaffoldConfig with engine-side defaults for the CLI-only
  // fields. The engine ignores them; they have to satisfy the schema.
  const fullConfig: ScaffoldConfig = {
    ...webConfig,
    destDir,
    initGit: false,
    createGithubRepos: false,
    githubVisibility: "private",
  };

  const options: ScaffoldOptions = {
    templatesRoot: findTemplatesRoot(),
    infraRoot: findInfraRoot(),
    cliVersion: WEB_VERSION,
    onEvent: events,
  };

  try {
    const result = await scaffold(fullConfig, options);
    return {
      result,
      destDir,
      cleanup: async () => {
        await fs.rm(tmpRoot, { recursive: true, force: true });
      },
    };
  } catch (err) {
    // If scaffold fails partway, the temp dir may be partially populated.
    await fs.rm(tmpRoot, { recursive: true, force: true });
    throw err;
  }
}
