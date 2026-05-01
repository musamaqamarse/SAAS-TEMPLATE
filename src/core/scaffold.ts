import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ScaffoldConfig, TemplateMeta } from "./schemas.js";
import { TemplateMetaSchema } from "./schemas.js";
import { copyDir, ensureEmpty, pathExists } from "./fs.js";
import { processTreePlaceholders } from "./placeholders.js";
import { buildSaasProjectConfig, writeSaasConfig, type ScaffoldedTemplate } from "./saas-config.js";
import { writeAgentRules } from "./agent-rules.js";

const execFileAsync = promisify(execFile);

/** Where templates and infra live on disk. The CLI passes the bundled paths;
 *  a web service or test harness can pass a different root. */
export interface ScaffoldOptions {
  templatesRoot: string;
  infraRoot: string;
  /** Recorded in `saas.config.json`; defaults to "0.0.0" if unknown. */
  cliVersion?: string;
  /** Optional progress hook so callers (CLI, web UI) can render their own UX. */
  onEvent?: (event: ScaffoldEvent) => void;
}

export type ScaffoldEvent =
  | { kind: "plan"; apps: number }
  | { kind: "app-start"; displayName: string; folder: string }
  | { kind: "app-skipped-flutter"; folder: string; reason: string }
  | { kind: "infra"; folder: string }
  | { kind: "agent-rules"; files: string[] }
  | { kind: "saas-config"; file: string }
  | { kind: "warning"; message: string };

export interface ScaffoldResult {
  destDir: string;
  /** Absolute paths of every directory created (apps + infra). */
  createdDirs: string[];
  scaffolded: ScaffoldedTemplate[];
  saasConfigPath: string;
  agentRulesPaths: string[];
}

interface AppPlan {
  templateDir: string;
  meta: TemplateMeta;
  destFolderName: string;
}

async function hasFlutter(): Promise<boolean> {
  try {
    await execFileAsync("flutter", ["--version"], { shell: true });
    return true;
  } catch {
    return false;
  }
}

export async function loadTemplateMeta(templateDir: string): Promise<TemplateMeta> {
  const metaPath = path.join(templateDir, "_template.json");
  const raw = await fs.readFile(metaPath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${metaPath}: ${(err as Error).message}`);
  }
  const result = TemplateMetaSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid template metadata in ${metaPath}:\n${issues}`);
  }
  return result.data;
}

async function planApps(cfg: ScaffoldConfig, templatesRoot: string, emit: (e: ScaffoldEvent) => void): Promise<AppPlan[]> {
  const wanted: Array<{ template: string; suffix: string }> = [];

  if (cfg.backend === "fastapi") wanted.push({ template: "backend-fastapi", suffix: "backend" });
  if (cfg.backend === "nextjs-api") wanted.push({ template: "backend-nextjs-api", suffix: "backend" });
  if (cfg.website === "nextjs") wanted.push({ template: "website-nextjs", suffix: "website" });
  if (cfg.website === "reactjs") wanted.push({ template: "website-reactjs", suffix: "website" });
  if (cfg.adminPanel === "nextjs") wanted.push({ template: "adminpanel-nextjs", suffix: "adminpanel" });
  if (cfg.mobile === "flutter") wanted.push({ template: "mobileapp-flutter", suffix: "mobileapp" });

  const plans: AppPlan[] = [];
  for (const w of wanted) {
    const dir = path.join(templatesRoot, w.template);
    if (!(await pathExists(dir))) {
      emit({ kind: "warning", message: `Template not found: ${w.template} — skipping` });
      continue;
    }
    const meta = await loadTemplateMeta(dir);
    if (!meta.supports.includes(cfg.dataStack)) {
      throw new Error(
        `Template ${w.template} does not support ${cfg.dataStack}. Pick a different stack or extend the template.`
      );
    }
    plans.push({
      templateDir: dir,
      meta,
      destFolderName: `${cfg.projectKebab}-${w.suffix}`,
    });
  }
  return plans;
}

async function copyOverlay(templateDir: string, destDir: string, dataStack: "supabase" | "firebase") {
  const commonDir = path.join(templateDir, "_common");
  if (await pathExists(commonDir)) {
    await copyDir(commonDir, destDir);
  }
  const overlayDir = path.join(templateDir, `_${dataStack}`);
  if (await pathExists(overlayDir)) {
    await copyDir(overlayDir, destDir);
  }
}

async function copyInfra(cfg: ScaffoldConfig, infraRoot: string, destRoot: string): Promise<string | null> {
  const infraSrc = path.join(infraRoot, cfg.dataStack);
  if (!(await pathExists(infraSrc))) return null;
  const dest = path.join(destRoot, `${cfg.projectKebab}-infra`);
  await copyDir(infraSrc, dest);
  await processTreePlaceholders(dest, cfg);
  return dest;
}

/**
 * The single entry point. CLI, web UI, and any future SDK call this. No
 * prompting, no telemetry, no git/gh — those are CLI concerns layered on top.
 */
export async function scaffold(cfg: ScaffoldConfig, options: ScaffoldOptions): Promise<ScaffoldResult> {
  const emit = options.onEvent ?? (() => {});

  await ensureEmpty(cfg.destDir);

  const plans = await planApps(cfg, options.templatesRoot, emit);
  if (plans.length === 0) throw new Error("No apps selected — nothing to do.");
  emit({ kind: "plan", apps: plans.length });

  const createdDirs: string[] = [];
  const scaffolded: ScaffoldedTemplate[] = [];

  const flutterAvailable = await hasFlutter();
  for (const plan of plans) {
    const dest = path.join(cfg.destDir, plan.destFolderName);
    emit({ kind: "app-start", displayName: plan.meta.displayName, folder: plan.destFolderName });
    await fs.mkdir(dest, { recursive: true });

    if (plan.meta.language === "dart") {
      if (flutterAvailable) {
        const org = cfg.bundleId.split(".").slice(0, -1).join(".");
        try {
          await execFileAsync(
            "flutter",
            ["create", "--project-name", cfg.projectSnake, "--org", org, "."],
            { cwd: dest, shell: true }
          );
        } catch (err) {
          emit({ kind: "warning", message: `flutter create failed: ${(err as Error).message.split("\n")[0]}` });
        }
      } else {
        emit({ kind: "app-skipped-flutter", folder: plan.destFolderName, reason: "flutter not on PATH" });
      }
    }

    await copyOverlay(plan.templateDir, dest, cfg.dataStack);
    await processTreePlaceholders(dest, cfg);
    createdDirs.push(dest);
    scaffolded.push({ meta: plan.meta, destFolderName: plan.destFolderName });
  }

  if (cfg.includeInfra) {
    const infraDir = await copyInfra(cfg, options.infraRoot, cfg.destDir);
    if (infraDir) {
      emit({ kind: "infra", folder: path.basename(infraDir) });
      createdDirs.push(infraDir);
    }
  }

  // saas.config.json — what every lifecycle command will read
  const projectConfig = buildSaasProjectConfig(cfg, scaffolded, options.cliVersion ?? "0.0.0");
  const saasConfigPath = await writeSaasConfig(cfg.destDir, projectConfig);
  emit({ kind: "saas-config", file: path.basename(saasConfigPath) });

  // CLAUDE.md / agents.md / .cursorrules
  const agentRulesPaths = await writeAgentRules(cfg.destDir, cfg, scaffolded);
  emit({ kind: "agent-rules", files: agentRulesPaths.map((p) => path.basename(p)) });

  return { destDir: cfg.destDir, createdDirs, scaffolded, saasConfigPath, agentRulesPaths };
}
