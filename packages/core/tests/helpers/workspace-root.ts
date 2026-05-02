import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Walk upward from this test file to find the workspace root (the directory
 * containing pnpm-workspace.yaml). Tests need this to locate the shared
 * `templates/` and `infra/` folders that live at the workspace root rather
 * than inside any single package.
 */
export function workspaceRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not find workspace root (looking for pnpm-workspace.yaml)");
}
