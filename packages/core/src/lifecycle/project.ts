import path from "node:path";
import { loadSaasConfig } from "../saas-config.js";
import type { SaasProjectConfig } from "../schemas.js";

/**
 * Resolved view of an existing scaffolded project. Every lifecycle command
 * (`update`, `add`, `remove`, `generate`) starts by calling `loadProject`
 * to get this — so they share one canonical way to find paths and config.
 */
export interface ProjectContext {
  /** Absolute path of the project root (the dir containing saas.config.json). */
  root: string;
  /** Parsed (and v1→v2 normalized) saas.config.json. */
  config: SaasProjectConfig;
  /** Where templates live for this run. CLI passes its bundled path; tests
   *  point at fixtures; `--templates <dir>` overrides at the call site. */
  templatesRoot: string;
  /** Where infra starters live. */
  infraRoot: string;
}

export interface LoadProjectOptions {
  templatesRoot: string;
  infraRoot: string;
}

/**
 * Load + validate `saas.config.json` from `dir` (which must be the project
 * root) and return a `ProjectContext`. Throws with a clear, user-facing
 * message when the config is missing or malformed.
 *
 * Stays narrow on purpose: callers supply `templatesRoot`/`infraRoot`
 * because only the CLI (or its `--templates` override) knows where the
 * authoritative templates for this run live. Keeping it caller-supplied
 * also makes the function trivially testable with fixtures.
 */
export async function loadProject(
  dir: string,
  opts: LoadProjectOptions
): Promise<ProjectContext> {
  const root = path.resolve(dir);
  const config = await loadSaasConfig(root);
  return {
    root,
    config,
    templatesRoot: opts.templatesRoot,
    infraRoot: opts.infraRoot,
  };
}
