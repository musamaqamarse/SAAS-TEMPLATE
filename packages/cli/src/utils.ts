import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

/**
 * Workspace root: the directory containing pnpm-workspace.yaml. Walked from
 * the CLI's installed location upward. In dev (`pnpm --filter create-saas dev`)
 * this resolves to the repo root; once the CLI is installed via npm we fall
 * back to the package's own root and rely on `templates/` and `infra/`
 * being bundled into the published package (handled by a `prepack` step).
 */
export function repoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    if (fs.existsSync(path.join(dir, "templates")) && fs.existsSync(path.join(dir, "infra"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Last resort: assume CLI is running from packages/cli/dist/ in the workspace.
  return path.resolve(__dirname, "..", "..", "..", "..");
}

// Project-name normalisers (toKebab / toSnake / toPascal / toBundleId) live
// in `@create-saas/core` so the CLI and the web configurator share one impl.
export { toKebab, toSnake, toPascal, toBundleId } from "@create-saas/core";
