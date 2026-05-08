import fs from "node:fs/promises";
import path from "node:path";
import { syncAgentRules } from "../agent-rules.js";
import { loadTemplateMeta } from "../scaffold.js";
import { scaffoldConfigFromProject, updateSaasConfig, type ScaffoldedTemplate } from "../saas-config.js";
import type { SaasProjectConfig } from "../schemas.js";
import { loadProject, type LoadProjectOptions } from "./project.js";

export type Role = "backend" | "website" | "adminpanel" | "mobileapp";

export interface RemoveOptions extends LoadProjectOptions {
  /** Project root (the dir containing saas.config.json). */
  projectDir: string;
  /** Role to remove. Refused if `composition[role] === "none"`. */
  role: Role;
}

export interface RemoveResult {
  removedFolder: string;
  removedTemplate: string;
  agentRulesPaths: string[];
  agentRulesDrifted: boolean;
  /** Apps the user may need to clean up by hand: env vars, CORS allowlists,
   *  cross-app fetch URLs that referenced the removed folder. We don't try
   *  to rewrite these — that's a Phase 4 plugin concern. */
  manualFollowUps: string[];
}

/**
 * Remove an app role from an existing scaffolded project.
 *
 * Concrete operations:
 *   1. Refuse if the role isn't present (composition === "none").
 *   2. Delete the role's folder under the project root.
 *   3. Update saas.config.json: composition[role] = "none"; drop templates entry.
 *   4. Re-render agent rules; if the user has hand-edited them, write
 *      `CLAUDE.md.new` etc. instead of overwriting.
 *
 * Pure to disk — no git operations, no telemetry, no prompts. The CLI layer
 * handles confirmation and event formatting.
 */
export async function removeApp(opts: RemoveOptions): Promise<RemoveResult> {
  const ctx = await loadProject(opts.projectDir, {
    templatesRoot: opts.templatesRoot,
    infraRoot: opts.infraRoot,
  });

  const compositionKey = roleToCompositionKey(opts.role);
  const current = ctx.config.composition[compositionKey];
  if (current === "none") {
    throw new Error(
      `No ${opts.role} configured in this project. Nothing to remove.`
    );
  }

  const entry = ctx.config.templates.find((t) => t.role === opts.role);
  if (!entry) {
    // composition says it exists but there's no template entry — manifest is
    // inconsistent. Surface clearly rather than silently no-op.
    throw new Error(
      `saas.config.json is inconsistent: composition.${compositionKey} = "${current}" ` +
        `but no template with role="${opts.role}" is recorded. Edit saas.config.json by hand or re-scaffold.`
    );
  }

  const folderPath = path.join(ctx.root, entry.folder);
  await fs.rm(folderPath, { recursive: true, force: true });

  const updatedConfig = await updateSaasConfig(ctx.root, (draft) => {
    setCompositionToNone(draft, opts.role);
    draft.templates = draft.templates.filter((t) => t.role !== opts.role);
  });

  // Re-sync agent rules with the new composition.
  const remainingScaffolded = await rebuildScaffoldedTemplates(updatedConfig, ctx.templatesRoot);
  const cfgShape = scaffoldConfigFromProject(updatedConfig);
  const sync = await syncAgentRules(ctx.root, cfgShape, remainingScaffolded, updatedConfig.agentRulesHash);

  // Persist the new hash only if we actually overwrote (drift would have
  // produced .new files, leaving the original — and its hash — unchanged).
  if (!sync.drifted) {
    await updateSaasConfig(ctx.root, (draft) => {
      draft.agentRulesHash = sync.newHash;
    });
  }

  const followUps = buildManualFollowUps(opts.role, entry.folder);

  return {
    removedFolder: folderPath,
    removedTemplate: entry.name,
    agentRulesPaths: sync.paths,
    agentRulesDrifted: sync.drifted,
    manualFollowUps: followUps,
  };
}

function roleToCompositionKey(role: Role): "backend" | "website" | "adminPanel" | "mobile" {
  switch (role) {
    case "backend": return "backend";
    case "website": return "website";
    case "adminpanel": return "adminPanel";
    case "mobileapp": return "mobile";
  }
}

function setCompositionToNone(draft: SaasProjectConfig, role: Role): void {
  switch (role) {
    case "backend":    draft.composition.backend    = "none"; return;
    case "website":    draft.composition.website    = "none"; return;
    case "adminpanel": draft.composition.adminPanel = "none"; return;
    case "mobileapp":  draft.composition.mobile     = "none"; return;
  }
}

/**
 * Re-load TemplateMeta for every entry in the persisted templates list.
 * Needed because agent-rules rendering takes a `ScaffoldedTemplate[]` (with
 * full meta) and saas.config.json only stores name/role/version/folder.
 *
 * If a template no longer exists on disk (e.g. the user is on a CLI version
 * that dropped a template), fall back to a minimal stub so rendering doesn't
 * blow up — the user will see "unknown" instead of a hard crash.
 */
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
      // Template was removed from this CLI version — render with a stub.
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

function buildManualFollowUps(role: Role, folder: string): string[] {
  const items: string[] = [];
  items.push(
    `Remove references to \`${folder}/\` from any cross-app fetch URLs or env vars (e.g. NEXT_PUBLIC_API_URL).`
  );
  if (role === "backend") {
    items.push(
      "If you removed the backend, the website/admin/mobile apps will need a new API target.",
    );
  }
  if (role === "website" || role === "adminpanel") {
    items.push(
      `If the backend has a CORS allowlist, drop the \`${folder}\` origin from it.`,
    );
  }
  return items;
}
