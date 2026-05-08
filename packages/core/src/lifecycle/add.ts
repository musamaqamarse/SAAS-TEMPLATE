import path from "node:path";
import { syncAgentRules } from "../agent-rules.js";
import { hasFlutter, loadTemplateMeta, scaffoldApp, type ScaffoldEvent } from "../scaffold.js";
import {
  scaffoldConfigFromProject,
  updateSaasConfig,
  type ScaffoldedTemplate,
} from "../saas-config.js";
import type { SaasProjectConfig } from "../schemas.js";
import { pathExists } from "../fs.js";
import { loadProject, type LoadProjectOptions } from "./project.js";
import type { Role } from "./remove.js";

/**
 * Per-role list of supported variants. Order matters: when no `--variant` is
 * supplied and only ONE option exists, it auto-selects. When multiple options
 * exist, the caller must pin one — we don't pick a default for the user
 * because it would silently determine the project's stack.
 */
export const VARIANTS_BY_ROLE: Record<Role, readonly string[]> = {
  backend: ["fastapi", "nextjs-api"],
  website: ["nextjs", "reactjs"],
  adminpanel: ["nextjs"],
  mobileapp: ["flutter"],
};

const FOLDER_SUFFIX_BY_ROLE: Record<Role, string> = {
  backend: "backend",
  website: "website",
  adminpanel: "adminpanel",
  mobileapp: "mobileapp",
};

export interface AddOptions extends LoadProjectOptions {
  projectDir: string;
  role: Role;
  /** Specific variant (e.g. "fastapi"). When the role only has one variant,
   *  this can be omitted and the sole option is used. */
  variant?: string;
  onEvent?: (e: ScaffoldEvent) => void;
}

export interface AddResult {
  templateName: string;
  destFolder: string;
  agentRulesPaths: string[];
  agentRulesDrifted: boolean;
}

/**
 * Bolt a new app role onto an existing scaffolded project.
 *
 * Concrete operations:
 *   1. Refuse if `composition[role] !== "none"` (already present).
 *   2. Resolve variant — auto when only one is supported, else required.
 *   3. Refuse if the destination folder already exists.
 *   4. Validate the template supports the project's data stack.
 *   5. Materialize via `scaffoldApp()` (same primitive `scaffold()` uses).
 *   6. Update saas.config.json (composition + templates entry).
 *   7. Re-render agent rules; emit `.new` files if the user has drifted them.
 */
export async function addApp(opts: AddOptions): Promise<AddResult> {
  const ctx = await loadProject(opts.projectDir, {
    templatesRoot: opts.templatesRoot,
    infraRoot: opts.infraRoot,
  });

  const compositionKey = roleToCompositionKey(opts.role);
  const current = ctx.config.composition[compositionKey];
  if (current !== "none") {
    throw new Error(
      `${opts.role} is already configured (current variant: ${current}). ` +
        `Run \`create-saas remove ${opts.role}\` first if you want to swap variants.`
    );
  }

  const variant = resolveVariant(opts.role, opts.variant);
  const templateName = `${FOLDER_SUFFIX_BY_ROLE[opts.role]}-${variant}`;
  const templateDir = path.join(ctx.templatesRoot, templateName);
  if (!(await pathExists(templateDir))) {
    throw new Error(
      `Template not found: ${templateName} (looked in ${ctx.templatesRoot}). ` +
        `If you're using a custom templates root, pass --templates <dir>.`
    );
  }

  const meta = await loadTemplateMeta(templateDir);
  if (!meta.supports.includes(ctx.config.composition.dataStack)) {
    throw new Error(
      `Template ${templateName} does not support ${ctx.config.composition.dataStack}. ` +
        `Supported: ${meta.supports.join(", ")}.`
    );
  }

  const destFolderName = `${ctx.config.project.kebab}-${FOLDER_SUFFIX_BY_ROLE[opts.role]}`;
  const destDir = path.join(ctx.root, destFolderName);
  if (await pathExists(destDir)) {
    throw new Error(
      `Folder ${destFolderName}/ already exists. Move or delete it before running \`add\`.`
    );
  }

  // Pre-check Flutter SDK only when we'd actually shell out for it. Today every
  // Flutter template ships prerendered, so this is essentially never needed —
  // but keep the path correct for future non-prerendered Dart templates.
  const flutterAvailable =
    meta.language === "dart" && !meta.prerendered ? await hasFlutter() : false;

  const placeholderInput = {
    projectName: ctx.config.project.name,
    projectKebab: ctx.config.project.kebab,
    projectSnake: ctx.config.project.snake,
    projectPascal: ctx.config.project.pascal,
    bundleId: ctx.config.project.bundleId,
    description: ctx.config.project.description,
    dataStack: ctx.config.composition.dataStack,
  };

  const scaffoldedEntry = await scaffoldApp({
    templateDir,
    meta,
    destDir,
    input: placeholderInput,
    flutterAvailable,
    onEvent: opts.onEvent,
  });

  // Update saas.config.json — composition flips from "none", new templates entry appended.
  const updatedConfig = await updateSaasConfig(ctx.root, (draft) => {
    setComposition(draft, opts.role, variant);
    draft.templates.push({
      name: meta.name,
      role: meta.role,
      version: meta.version ?? "0.0.0",
      folder: destFolderName,
      appliedMigrations: [],
    });
  });

  // Re-render agent rules for the new composition.
  const allScaffolded = await rebuildScaffoldedTemplates(updatedConfig, ctx.templatesRoot, [
    scaffoldedEntry,
  ]);
  const cfgShape = scaffoldConfigFromProject(updatedConfig);
  const sync = await syncAgentRules(ctx.root, cfgShape, allScaffolded, updatedConfig.agentRulesHash);

  if (!sync.drifted) {
    await updateSaasConfig(ctx.root, (draft) => {
      draft.agentRulesHash = sync.newHash;
    });
  }

  return {
    templateName: meta.name,
    destFolder: destDir,
    agentRulesPaths: sync.paths,
    agentRulesDrifted: sync.drifted,
  };
}

function resolveVariant(role: Role, requested: string | undefined): string {
  const variants = VARIANTS_BY_ROLE[role];
  if (requested) {
    if (!variants.includes(requested)) {
      throw new Error(
        `Unknown variant "${requested}" for ${role}. Supported: ${variants.join(", ")}.`
      );
    }
    return requested;
  }
  if (variants.length === 1) return variants[0];
  throw new Error(
    `${role} has multiple variants (${variants.join(", ")}). Pass --variant <id>.`
  );
}

function roleToCompositionKey(role: Role): "backend" | "website" | "adminPanel" | "mobile" {
  switch (role) {
    case "backend": return "backend";
    case "website": return "website";
    case "adminpanel": return "adminPanel";
    case "mobileapp": return "mobile";
  }
}

function setComposition(draft: SaasProjectConfig, role: Role, variant: string): void {
  switch (role) {
    case "backend":
      draft.composition.backend = variant as SaasProjectConfig["composition"]["backend"];
      return;
    case "website":
      draft.composition.website = variant as SaasProjectConfig["composition"]["website"];
      return;
    case "adminpanel":
      draft.composition.adminPanel = variant as SaasProjectConfig["composition"]["adminPanel"];
      return;
    case "mobileapp":
      draft.composition.mobile = variant as SaasProjectConfig["composition"]["mobile"];
      return;
  }
}

/**
 * Re-load TemplateMeta for every entry in the persisted templates list, with
 * a freshly-scaffolded entry merged in (the persisted config now lists it,
 * but its meta is already in memory — no need to re-read it from disk).
 */
async function rebuildScaffoldedTemplates(
  config: SaasProjectConfig,
  templatesRoot: string,
  freshlyScaffolded: ScaffoldedTemplate[]
): Promise<ScaffoldedTemplate[]> {
  const freshByName = new Map(freshlyScaffolded.map((s) => [s.meta.name, s] as const));
  const out: ScaffoldedTemplate[] = [];
  for (const entry of config.templates) {
    const fresh = freshByName.get(entry.name);
    if (fresh) {
      out.push(fresh);
      continue;
    }
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
