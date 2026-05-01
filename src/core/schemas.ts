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
 * project root. This is the contract that future lifecycle commands
 * (`update`, `add`, `remove`) rely on, so be careful when changing it —
 * bump `schemaVersion` if you do.
 */
export const SaasProjectConfigSchema = z.object({
  schemaVersion: z.literal(1),
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
  templates: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      version: z.string(),
      folder: z.string(),
    })
  ),
});
export type SaasProjectConfig = z.infer<typeof SaasProjectConfigSchema>;
