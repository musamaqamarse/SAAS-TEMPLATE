/**
 * @create-saas/core — the headless scaffolding engine.
 *
 * Public surface:
 *   - `scaffold(config, options)` — produces a project on disk from a typed config
 *   - `loadTemplateMeta(dir)` — reads + validates a template's `_template.json`
 *   - `buildSaasProjectConfig`, `writeSaasConfig` — `saas.config.json` helpers
 *   - `renderAgentRules`, `writeAgentRules` — CLAUDE.md / agents.md / .cursorrules
 *   - All Zod schemas and inferred types for `ScaffoldConfig`, `TemplateMeta`,
 *     `SaasProjectConfig`, and the choice enums.
 *
 * Everything here is pure-ish: it reads templates, writes to `cfg.destDir`,
 * and emits events. It never prompts the user, talks to git/gh, or sends
 * telemetry — those are CLI concerns layered on top.
 */
export * from "./schemas.js";
export * from "./scaffold.js";
export * from "./saas-config.js";
export * from "./agent-rules.js";
export { buildReplacements, applyReplacements, processTreePlaceholders } from "./placeholders.js";
export { copyDir, ensureEmpty, pathExists } from "./fs.js";
export { toKebab, toSnake, toPascal, toBundleId } from "./identifiers.js";

// Phase 3 — lifecycle commands
export { loadProject, type ProjectContext, type LoadProjectOptions } from "./lifecycle/project.js";
export { removeApp, type Role, type RemoveOptions, type RemoveResult } from "./lifecycle/remove.js";
export { addApp, VARIANTS_BY_ROLE, type AddOptions, type AddResult } from "./lifecycle/add.js";
export { generateUnit, type GenerateOptions, type GenerateResult } from "./lifecycle/generate.js";
export { GENERATOR_UNITS, type GeneratorUnit } from "./generators/schema.js";

// Phase 3 — migrations (used by `update`)
export { MigrationSchema, MigrationOpSchema, type Migration, type MigrationOp } from "./migrations/schema.js";
export { loadMigrations, buildMigrationChain } from "./migrations/loader.js";
export { applyMigration, type ApplyMigrationResult, type MigrationConflict, type ConflictKind } from "./migrations/apply.js";
export {
  updateProject,
  type UpdateOptions,
  type UpdateResult,
  type TemplateUpdatePlan,
  type TemplateUpdateOutcome,
} from "./lifecycle/update.js";
