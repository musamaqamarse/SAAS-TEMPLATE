import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import pc from "picocolors";
import { ScaffoldConfig, TemplateMeta } from "./types.js";
import { TemplateMetaSchema } from "./schemas.js";
import { copyDir, ensureEmpty, pathExists } from "./fs.js";
import { processTreePlaceholders } from "./placeholders.js";
import { ghCreateRepo, gitInitAndCommit, hasGh, hasGit } from "./git.js";
import { repoRoot } from "./utils.js";

const execFileAsync = promisify(execFile);

async function hasFlutter(): Promise<boolean> {
  try {
    await execFileAsync("flutter", ["--version"], { shell: true });
    return true;
  } catch {
    return false;
  }
}

interface AppPlan {
  templateDir: string;
  meta: TemplateMeta;
  destFolderName: string;
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

async function planApps(cfg: ScaffoldConfig): Promise<AppPlan[]> {
  const templatesRoot = path.join(repoRoot(), "templates");
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
      console.warn(pc.yellow(`  ! Template not found: ${w.template} — skipping`));
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

async function copyInfra(cfg: ScaffoldConfig, destRoot: string): Promise<string | null> {
  const infraSrc = path.join(repoRoot(), "infra", cfg.dataStack);
  if (!(await pathExists(infraSrc))) return null;
  const dest = path.join(destRoot, `${cfg.projectKebab}-infra`);
  await copyDir(infraSrc, dest);
  await processTreePlaceholders(dest, cfg);
  return dest;
}

export async function scaffold(cfg: ScaffoldConfig): Promise<void> {
  console.log(pc.bold("\nScaffolding ") + pc.cyan(cfg.projectName) + pc.gray(`  →  ${cfg.destDir}`));
  console.log(pc.gray(`  data stack: ${cfg.dataStack}`));

  await ensureEmpty(cfg.destDir);

  const plans = await planApps(cfg);
  if (plans.length === 0) throw new Error("No apps selected — nothing to do.");

  const createdDirs: string[] = [];

  // Per-app scaffold
  const flutterAvailable = await hasFlutter();
  for (const plan of plans) {
    const dest = path.join(cfg.destDir, plan.destFolderName);
    console.log(pc.dim(`  • ${plan.meta.displayName}  →  ${plan.destFolderName}`));
    await fs.mkdir(dest, { recursive: true });

    // For Flutter apps, bootstrap with `flutter create` first so platform
    // folders (android/, ios/, etc.) are generated, then overlay our templates.
    if (plan.meta.language === "dart") {
      if (flutterAvailable) {
        console.log(pc.dim("    running flutter create…"));
        const org = cfg.bundleId.split(".").slice(0, -1).join(".");
        try {
          await execFileAsync(
            "flutter",
            ["create", "--project-name", cfg.projectSnake, "--org", org, "."],
            { cwd: dest, shell: true }
          );
        } catch (err) {
          console.warn(pc.yellow(`    ! flutter create failed: ${(err as Error).message.split("\n")[0]}`));
        }
      } else {
        console.warn(pc.yellow("    ! flutter not found on PATH — skipping flutter create (run it manually)"));
      }
    }

    await copyOverlay(plan.templateDir, dest, cfg.dataStack);
    await processTreePlaceholders(dest, cfg);
    createdDirs.push(dest);
  }

  // Infra
  if (cfg.includeInfra) {
    const infraDir = await copyInfra(cfg, cfg.destDir);
    if (infraDir) {
      console.log(pc.dim(`  • Infra (${cfg.dataStack})  →  ${path.basename(infraDir)}`));
      createdDirs.push(infraDir);
    }
  }

  // Git per subfolder
  if (cfg.initGit) {
    if (!(await hasGit())) {
      console.warn(pc.yellow("  ! git not found on PATH — skipping git init"));
    } else {
      console.log(pc.dim("\n  Initializing git repos…"));
      for (const dir of createdDirs) {
        try {
          await gitInitAndCommit(dir, "chore: initial scaffold");
          console.log(pc.dim(`    ✓ ${path.basename(dir)}`));
        } catch (err) {
          console.warn(pc.yellow(`    ! git init failed for ${path.basename(dir)}: ${(err as Error).message.split("\n")[0]}`));
        }
      }
    }
  }

  // GitHub repos
  if (cfg.createGithubRepos) {
    if (!(await hasGh())) {
      console.warn(pc.yellow("  ! gh CLI not found — skipping remote repo creation"));
    } else {
      console.log(pc.dim("\n  Creating GitHub repos…"));
      for (const dir of createdDirs) {
        const url = await ghCreateRepo(dir, path.basename(dir), cfg.githubVisibility, cfg.description);
        if (url) console.log(pc.dim(`    ✓ ${path.basename(dir)}  ${url}`));
      }
    }
  }

  console.log("");
  console.log(pc.green(pc.bold("Done.")) + " Next steps:");
  console.log(pc.gray(`  cd ${path.basename(cfg.destDir)}`));
  for (const dir of createdDirs) {
    console.log(pc.gray(`  • ${path.basename(dir)} — see its README for setup`));
  }
  console.log("");
}
