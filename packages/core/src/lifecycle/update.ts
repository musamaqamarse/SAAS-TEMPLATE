import path from "node:path";
import { syncAgentRules } from "../agent-rules.js";
import { loadTemplateMeta } from "../scaffold.js";
import {
  scaffoldConfigFromProject,
  updateSaasConfig,
  type ScaffoldedTemplate,
} from "../saas-config.js";
import type { SaasProjectConfig, SaasProjectTemplateEntry } from "../schemas.js";
import { applyMigration, type MigrationConflict } from "../migrations/apply.js";
import { buildMigrationChain, loadMigrations } from "../migrations/loader.js";
import type { Migration } from "../migrations/schema.js";
import { loadProject, type LoadProjectOptions } from "./project.js";

export interface UpdateOptions extends LoadProjectOptions {
  projectDir: string;
  /** Don't write any changes; just compute and return the planned chain. */
  dryRun?: boolean;
}

export interface TemplateUpdatePlan {
  /** Template name (e.g. "backend-fastapi"). */
  template: string;
  /** Folder under the project root where this template lives. */
  folder: string;
  fromVersion: string;
  toVersion: string;
  migrations: Migration[];
}

export interface TemplateUpdateOutcome {
  template: string;
  folder: string;
  fromVersion: string;
  toVersion: string;
  appliedMigrationIds: string[];
  conflicts: MigrationConflict[];
}

export interface UpdateResult {
  /** When `dryRun` is true, only `plans` is meaningful; nothing was written. */
  dryRun: boolean;
  plans: TemplateUpdatePlan[];
  outcomes: TemplateUpdateOutcome[];
  /** True when at least one template had work to do. */
  changed: boolean;
  agentRulesPaths: string[];
  agentRulesDrifted: boolean;
}

/**
 * The lifecycle moat. Walks each template entry's recorded version → the
 * current `_template.json` version, applying any declarative migrations
 * along the way. Migrations already in `appliedMigrations` are skipped, so
 * partial failures and re-runs converge.
 *
 * Algorithm:
 *   1. For each template entry in saas.config.json:
 *      a. Load on-disk template meta to get the current version.
 *      b. If equal to the recorded version → no-op for this template.
 *      c. Else build the migration chain (recorded → current).
 *      d. Filter out migrations whose IDs already appear in
 *         `appliedMigrations`.
 *   2. In dry-run mode, stop and return the plans.
 *   3. Otherwise apply each migration to the corresponding app folder.
 *      Conflicts are collected, not thrown — the user reviews them at the
 *      end.
 *   4. Persist new versions and `appliedMigrations` IDs into saas.config.json.
 *   5. Re-render agent rules (drift-aware: hand-edited files become `.new`
 *      siblings rather than getting clobbered).
 */
export async function updateProject(opts: UpdateOptions): Promise<UpdateResult> {
  const ctx = await loadProject(opts.projectDir, {
    templatesRoot: opts.templatesRoot,
    infraRoot: opts.infraRoot,
  });

  const plans: TemplateUpdatePlan[] = [];
  const planMigrationsDir = new Map<string, string>();

  for (const entry of ctx.config.templates) {
    const templateDir = path.join(ctx.templatesRoot, entry.name);
    const meta = await loadTemplateMeta(templateDir);
    const currentVersion = meta.version ?? "0.0.0";
    if (currentVersion === entry.version) continue;

    const loaded = await loadMigrations(ctx.templatesRoot, entry.name);
    const allMigrations = loaded.map((l) => l.migration);
    const migrationsDir = loaded[0]?.dir;
    if (migrationsDir) planMigrationsDir.set(entry.name, migrationsDir);

    const chain = buildMigrationChain(allMigrations, entry.version, currentVersion);
    const pending = chain.filter((m) => !entry.appliedMigrations.includes(m.id));
    if (pending.length === 0 && currentVersion === entry.version) continue;

    plans.push({
      template: entry.name,
      folder: entry.folder,
      fromVersion: entry.version,
      toVersion: currentVersion,
      migrations: pending,
    });
  }

  // Nothing to do — exit early without touching disk.
  if (plans.length === 0) {
    return {
      dryRun: opts.dryRun ?? false,
      plans: [],
      outcomes: [],
      changed: false,
      agentRulesPaths: [],
      agentRulesDrifted: false,
    };
  }

  if (opts.dryRun) {
    return {
      dryRun: true,
      plans,
      outcomes: [],
      changed: true,
      agentRulesPaths: [],
      agentRulesDrifted: false,
    };
  }

  const outcomes: TemplateUpdateOutcome[] = [];
  for (const plan of plans) {
    const appDir = path.join(ctx.root, plan.folder);
    const migrationDir = planMigrationsDir.get(plan.template);
    const appliedIds: string[] = [];
    const conflicts: MigrationConflict[] = [];

    for (const migration of plan.migrations) {
      // No migrationDir means the template ships migrations.json files but
      // we never indexed one — only possible if the chain is empty, which
      // we filtered out above. Defensive guard:
      if (!migrationDir) {
        throw new Error(
          `Internal: missing migrations dir for ${plan.template} despite having a chain.`
        );
      }
      const result = await applyMigration(migration, { appDir, migrationDir });
      appliedIds.push(migration.id);
      conflicts.push(...result.conflicts);
    }

    outcomes.push({
      template: plan.template,
      folder: plan.folder,
      fromVersion: plan.fromVersion,
      toVersion: plan.toVersion,
      appliedMigrationIds: appliedIds,
      conflicts,
    });
  }

  // Persist the new versions and applied-migration IDs.
  const updatedConfig = await updateSaasConfig(ctx.root, (draft) => {
    for (const o of outcomes) {
      const entry = draft.templates.find((t) => t.name === o.template) as
        | SaasProjectTemplateEntry
        | undefined;
      if (!entry) continue;
      entry.version = o.toVersion;
      entry.appliedMigrations = [...entry.appliedMigrations, ...o.appliedMigrationIds];
    }
  });

  // Re-sync agent rules with the updated stack snapshot.
  const allScaffolded = await rebuildScaffoldedTemplates(updatedConfig, ctx.templatesRoot);
  const cfgShape = scaffoldConfigFromProject(updatedConfig);
  const sync = await syncAgentRules(ctx.root, cfgShape, allScaffolded, updatedConfig.agentRulesHash);
  if (!sync.drifted) {
    await updateSaasConfig(ctx.root, (draft) => {
      draft.agentRulesHash = sync.newHash;
    });
  }

  return {
    dryRun: false,
    plans,
    outcomes,
    changed: outcomes.length > 0,
    agentRulesPaths: sync.paths,
    agentRulesDrifted: sync.drifted,
  };
}

async function rebuildScaffoldedTemplates(
  config: SaasProjectConfig,
  templatesRoot: string
): Promise<ScaffoldedTemplate[]> {
  const out: ScaffoldedTemplate[] = [];
  for (const entry of config.templates) {
    try {
      const meta = await loadTemplateMeta(path.join(templatesRoot, entry.name));
      out.push({ meta, destFolderName: entry.folder });
    } catch {
      out.push({
        meta: {
          name: entry.name,
          role: entry.role as ScaffoldedTemplate["meta"]["role"],
          displayName: entry.name,
          language: "typescript",
          supports: ["supabase", "firebase"],
          folderSuffix: entry.role,
          version: entry.version,
        },
        destFolderName: entry.folder,
      });
    }
  }
  return out;
}
