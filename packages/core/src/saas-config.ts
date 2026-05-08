import fs from "node:fs/promises";
import path from "node:path";
import { SaasProjectConfigSchema } from "./schemas.js";
import type { ScaffoldConfig, SaasProjectConfig, TemplateMeta } from "./schemas.js";

export interface ScaffoldedTemplate {
  meta: TemplateMeta;
  destFolderName: string;
}

export const SAAS_CONFIG_FILENAME = "saas.config.json";

/**
 * Build the persisted project config that gets written to `saas.config.json`
 * at the project root. This is the contract every lifecycle command (`update`,
 * `add`, `remove`) reads from to know what the project actually is.
 *
 * Strips scaffolding-time intent (initGit, createGithubRepos, githubVisibility,
 * destDir) — those describe the act of creation, not the project.
 */
export function buildSaasProjectConfig(
  cfg: ScaffoldConfig,
  scaffolded: ScaffoldedTemplate[],
  cliVersion: string
): SaasProjectConfig {
  return {
    schemaVersion: 2,
    createdAt: new Date().toISOString(),
    cliVersion,
    project: {
      name: cfg.projectName,
      kebab: cfg.projectKebab,
      snake: cfg.projectSnake,
      pascal: cfg.projectPascal,
      bundleId: cfg.bundleId,
      description: cfg.description,
    },
    composition: {
      dataStack: cfg.dataStack,
      backend: cfg.backend,
      website: cfg.website,
      adminPanel: cfg.adminPanel,
      mobile: cfg.mobile,
      includeInfra: cfg.includeInfra,
    },
    templates: scaffolded.map((s) => ({
      name: s.meta.name,
      role: s.meta.role,
      version: s.meta.version ?? "0.0.0",
      folder: s.destFolderName,
      appliedMigrations: [],
    })),
  };
}

export async function writeSaasConfig(
  destDir: string,
  config: SaasProjectConfig
): Promise<string> {
  const filePath = path.join(destDir, SAAS_CONFIG_FILENAME);
  await fs.writeFile(filePath, JSON.stringify(config, null, 2) + "\n", "utf8");
  return filePath;
}

/**
 * Read and validate a project's `saas.config.json`. Accepts both v1 (Phase 1
 * shape) and v2 (Phase 3 shape) on disk and returns a normalized v2. v1 files
 * are migrated in-memory only — call `writeSaasConfig` if you want the upgrade
 * persisted.
 *
 * Throws with a clear, user-facing message when the file is missing or
 * malformed. Lifecycle commands rely on this — if it can't be read, there's
 * nothing meaningful they can do.
 */
export async function loadSaasConfig(projectDir: string): Promise<SaasProjectConfig> {
  const filePath = path.join(projectDir, SAAS_CONFIG_FILENAME);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    throw new Error(
      `No ${SAAS_CONFIG_FILENAME} found in ${projectDir}. ` +
        `Lifecycle commands (update / add / remove / generate) only work inside a ` +
        `project that was scaffolded by create-saas. Run them from the project root.`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${filePath}: ${(err as Error).message}`);
  }

  const normalized = normalizeToV2(parsed);

  const result = SaasProjectConfigSchema.safeParse(normalized);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid ${SAAS_CONFIG_FILENAME} at ${filePath}:\n${issues}`);
  }
  return result.data;
}

/**
 * Load → mutate → write helper. Mutator runs against a deep clone so callers
 * can edit freely without aliasing the on-disk view; the result is what gets
 * persisted. Used by every lifecycle command that updates the manifest.
 */
export async function updateSaasConfig(
  projectDir: string,
  mutator: (cfg: SaasProjectConfig) => SaasProjectConfig | void
): Promise<SaasProjectConfig> {
  const current = await loadSaasConfig(projectDir);
  const draft = structuredClone(current);
  const result = mutator(draft) ?? draft;
  await writeSaasConfig(projectDir, result);
  return result;
}

/**
 * In-memory v1 → v2 normalization. v1 lacked `appliedMigrations` on each
 * template entry and `agentRulesHash` at the root. We add safe defaults
 * without touching disk; callers that want to persist the upgrade can call
 * `writeSaasConfig` afterwards.
 */
function normalizeToV2(input: unknown): unknown {
  if (!isObject(input)) return input;
  const obj = { ...input } as Record<string, unknown>;

  if (obj.schemaVersion === 1) obj.schemaVersion = 2;

  if (Array.isArray(obj.templates)) {
    obj.templates = obj.templates.map((t) => {
      if (!isObject(t)) return t;
      if (Array.isArray((t as Record<string, unknown>).appliedMigrations)) return t;
      return { ...t, appliedMigrations: [] };
    });
  }
  return obj;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Rebuild a `ScaffoldConfig`-shaped object from a persisted `SaasProjectConfig`.
 *
 * Lifecycle commands (`add`, `remove`, `update`, `generate`) need to feed
 * placeholder substitution and agent-rules rendering — both originally typed
 * around `ScaffoldConfig`. The scaffolding-time intent fields
 * (`destDir`/`initGit`/`createGithubRepos`/`githubVisibility`) are unread by
 * those code paths, so we fill them with safe defaults rather than threading
 * them through.
 *
 * Pure: no I/O. Caller decides what to do with the result.
 */
export function scaffoldConfigFromProject(p: SaasProjectConfig): ScaffoldConfig {
  return {
    projectName: p.project.name,
    projectKebab: p.project.kebab,
    projectSnake: p.project.snake,
    projectPascal: p.project.pascal,
    bundleId: p.project.bundleId,
    description: p.project.description,
    destDir: "",
    dataStack: p.composition.dataStack,
    backend: p.composition.backend,
    website: p.composition.website,
    adminPanel: p.composition.adminPanel,
    mobile: p.composition.mobile,
    includeInfra: p.composition.includeInfra,
    initGit: false,
    createGithubRepos: false,
    githubVisibility: "private",
  };
}
