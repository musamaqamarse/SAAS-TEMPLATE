import { z } from "zod";

export const DataStackSchema = z.enum(["supabase", "firebase"]);
export type DataStack = z.infer<typeof DataStackSchema>;

export const BackendChoiceSchema = z.enum(["fastapi", "nextjs-api", "none"]);
export type BackendChoice = z.infer<typeof BackendChoiceSchema>;

export const WebsiteChoiceSchema = z.enum(["nextjs", "reactjs", "none"]);
export type WebsiteChoice = z.infer<typeof WebsiteChoiceSchema>;

export const AdminChoiceSchema = z.enum(["nextjs", "none"]);
export type AdminChoice = z.infer<typeof AdminChoiceSchema>;

export const MobileChoiceSchema = z.enum(["flutter", "none"]);
export type MobileChoice = z.infer<typeof MobileChoiceSchema>;

/**
 * Schema for `_template.json` files inside templates/<template>/.
 * Every template MUST conform; loader fails loudly on any deviation so a
 * malformed template can never silently degrade a scaffold.
 */
export const TemplateMetaSchema = z.object({
  name: z.string().min(1),
  role: z.enum(["backend", "website", "adminpanel", "mobileapp"]),
  displayName: z.string().min(1),
  language: z.enum(["typescript", "python", "dart"]),
  supports: z.array(DataStackSchema).min(1),
  folderSuffix: z.string().min(1),
  /** Recommended — enables future `update` command and is recorded in saas.config.json. */
  version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  /**
   * When true, the engine treats `_prerendered/` as the canonical starter and
   * skips any toolchain shell-out (e.g. `flutter create`). Lets the web UI
   * scaffold mobile apps without the SDK installed on the server.
   */
  prerendered: z.boolean().optional(),
});
export type TemplateMeta = z.infer<typeof TemplateMetaSchema>;

/**
 * Final scaffold input. Single source of truth shared by the CLI, future web
 * UI, and the headless engine. All consumers produce a `ScaffoldConfig`; the
 * scaffolder only ever takes one of these.
 *
 * Fields fall into three groups:
 *   - identity: projectName/Kebab/Snake/Pascal, bundleId, description
 *   - composition: dataStack + per-app picks + includeInfra
 *   - scaffolding-time intent (CLI-only): destDir, initGit, createGithubRepos,
 *     githubVisibility — the engine ignores these; they exist so the CLI can
 *     drive its post-scaffold side effects from one config object.
 */
export const ScaffoldConfigSchema = z.object({
  projectName: z.string().min(2),
  projectKebab: z.string().min(1),
  projectSnake: z.string().min(1),
  projectPascal: z.string().min(1),
  bundleId: z.string().regex(/^[a-z][a-z0-9.]*\.[a-z][a-z0-9]*$/, {
    message: "bundleId must look like com.vendor.app (lowercase, dot-separated)",
  }),
  description: z.string(),
  destDir: z.string().min(1),
  dataStack: DataStackSchema,
  backend: BackendChoiceSchema,
  website: WebsiteChoiceSchema,
  adminPanel: AdminChoiceSchema,
  mobile: MobileChoiceSchema,
  includeInfra: z.boolean(),
  initGit: z.boolean(),
  createGithubRepos: z.boolean(),
  githubVisibility: z.enum(["private", "public"]),
});
export type ScaffoldConfig = z.infer<typeof ScaffoldConfigSchema>;

/**
 * Persisted shape of `saas.config.json`, written into every scaffolded
 * project root. This is the contract that lifecycle commands (`update`,
 * `add`, `remove`, `generate`) rely on.
 *
 * v2 (Phase 3) adds:
 *   - `templates[].appliedMigrations` — IDs of migrations already run, so
 *     `update` is idempotent across reruns and partial failures.
 *   - `agentRulesHash` — sha256 of the last-rendered CLAUDE.md content. Lets
 *     `update`/`add`/`remove` detect whether the user has hand-edited the
 *     agent rules file before deciding to overwrite or write a `.new` sibling.
 *
 * v1 files load fine via `loadSaasConfig` — missing fields are populated with
 * safe defaults (`appliedMigrations: []`, `agentRulesHash: undefined`).
 */
export const SaasProjectTemplateEntrySchema = z.object({
  name: z.string(),
  role: z.string(),
  version: z.string(),
  folder: z.string(),
  /** Migration IDs (e.g. "1.0.0_to_1.1.0") already applied to this template. */
  appliedMigrations: z.array(z.string()).default([]),
});
export type SaasProjectTemplateEntry = z.infer<typeof SaasProjectTemplateEntrySchema>;

export const SaasProjectConfigSchema = z.object({
  schemaVersion: z.literal(2),
  createdAt: z.string(),
  cliVersion: z.string(),
  project: z.object({
    name: z.string(),
    kebab: z.string(),
    snake: z.string(),
    pascal: z.string(),
    bundleId: z.string(),
    description: z.string(),
  }),
  composition: z.object({
    dataStack: DataStackSchema,
    backend: BackendChoiceSchema,
    website: WebsiteChoiceSchema,
    adminPanel: AdminChoiceSchema,
    mobile: MobileChoiceSchema,
    includeInfra: z.boolean(),
  }),
  templates: z.array(SaasProjectTemplateEntrySchema),
  agentRulesHash: z.string().optional(),
});
export type SaasProjectConfig = z.infer<typeof SaasProjectConfigSchema>;
