import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import prompts from "prompts";
import pc from "picocolors";
import { ScaffoldConfigSchema, type ScaffoldConfig } from "./core/index.js";
import { toBundleId, toKebab, toPascal, toSnake } from "./utils.js";
import type { ParsedFlags } from "./flags.js";

function onCancel() {
  console.log(pc.yellow("Cancelled."));
  process.exit(1);
}

interface BuildArgs {
  projectName: string;
  description: string;
  dataStack: "supabase" | "firebase";
  backend: "fastapi" | "nextjs-api" | "none";
  website: "nextjs" | "reactjs" | "none";
  admin: "nextjs" | "none";
  mobile: "flutter" | "none";
  bundleVendor: string;
  includeInfra: boolean;
  initGit: boolean;
  createGithubRepos: boolean;
  githubVisibility: "private" | "public";
  out?: string;
}

function buildScaffoldConfig(a: BuildArgs): ScaffoldConfig {
  const projectKebab = toKebab(a.projectName);
  const cfg: ScaffoldConfig = {
    projectName: a.projectName,
    projectKebab,
    projectSnake: toSnake(a.projectName),
    projectPascal: toPascal(a.projectName),
    bundleId: toBundleId(projectKebab, a.bundleVendor || "com.example"),
    description: a.description,
    destDir: path.resolve(process.cwd(), a.out ?? projectKebab),
    dataStack: a.dataStack,
    backend: a.backend,
    website: a.website,
    adminPanel: a.admin,
    mobile: a.mobile,
    includeInfra: a.includeInfra,
    initGit: a.initGit,
    createGithubRepos: a.createGithubRepos,
    githubVisibility: a.githubVisibility,
  };
  // Validate at the boundary so a malformed flag combo dies here, not inside the engine.
  return ScaffoldConfigSchema.parse(cfg);
}

export async function loadConfigFile(filePath: string): Promise<ScaffoldConfig> {
  const raw = await fs.readFile(path.resolve(filePath), "utf8");
  const parsed = JSON.parse(raw);
  return ScaffoldConfigSchema.parse(parsed);
}

/** Build a config purely from flags (no prompts). Used for CI / agents. */
export function configFromFlags(flags: ParsedFlags): ScaffoldConfig {
  const projectName = (flags.name ?? flags.positional ?? "").trim();
  if (projectName.length < 2) {
    throw new Error("Project name is required (--name <text> or positional). Min 2 chars.");
  }
  return buildScaffoldConfig({
    projectName,
    description: flags.description ?? "A new SaaS project",
    dataStack: (flags.dataStack as BuildArgs["dataStack"]) ?? "supabase",
    backend: (flags.backend as BuildArgs["backend"]) ?? "fastapi",
    website: (flags.website as BuildArgs["website"]) ?? "nextjs",
    admin: (flags.admin as BuildArgs["admin"]) ?? "nextjs",
    mobile: (flags.mobile as BuildArgs["mobile"]) ?? "none",
    bundleVendor: flags.bundleVendor ?? "com.example",
    includeInfra: flags.includeInfra ?? true,
    initGit: flags.initGit ?? true,
    createGithubRepos: flags.createGithubRepos ?? false,
    githubVisibility: flags.githubVisibility ?? "private",
    out: flags.out,
  });
}

/**
 * Interactive prompts. Any answer the user pinned down via a flag is used as
 * the prompt default, so `--data-stack firebase` shows Firebase pre-selected.
 */
export async function runPrompts(flags: ParsedFlags): Promise<ScaffoldConfig | null> {
  const initialName = flags.name ?? flags.positional ?? "";

  const dataStackChoices = [
    { title: "Supabase", value: "supabase" },
    { title: "Firebase", value: "firebase" },
  ];
  const backendChoices = [
    { title: "FastAPI (Python)", value: "fastapi" },
    { title: "Next.js API routes", value: "nextjs-api" },
    { title: "None (use data stack directly from clients)", value: "none" },
  ];
  const websiteChoices = [
    { title: "Next.js (App Router)", value: "nextjs" },
    { title: "React + Vite", value: "reactjs" },
    { title: "None", value: "none" },
  ];
  const idxOf = (choices: { value: string }[], value: string | undefined, fallback: number) => {
    if (!value) return fallback;
    const i = choices.findIndex((c) => c.value === value);
    return i >= 0 ? i : fallback;
  };

  const answers = await prompts(
    [
      {
        type: "text",
        name: "projectName",
        message: "Project name",
        initial: initialName,
        validate: (v: string) => (v.trim().length > 1 ? true : "Name must be at least 2 characters"),
      },
      {
        type: "text",
        name: "description",
        message: "One-line description",
        initial: flags.description ?? "A new SaaS project",
      },
      {
        type: "select",
        name: "dataStack",
        message: "Data / auth / storage stack",
        choices: dataStackChoices,
        initial: idxOf(dataStackChoices, flags.dataStack, 0),
      },
      {
        type: "select",
        name: "backend",
        message: "Backend",
        choices: backendChoices,
        initial: idxOf(backendChoices, flags.backend, 0),
      },
      {
        type: "select",
        name: "website",
        message: "Marketing / app website",
        choices: websiteChoices,
        initial: idxOf(websiteChoices, flags.website, 0),
      },
      {
        type: "toggle",
        name: "adminPanel",
        message: "Include admin panel (Next.js)?",
        initial: flags.admin ? flags.admin === "nextjs" : true,
        active: "yes",
        inactive: "no",
      },
      {
        type: "toggle",
        name: "mobile",
        message: "Include Flutter mobile app?",
        initial: flags.mobile ? flags.mobile === "flutter" : true,
        active: "yes",
        inactive: "no",
      },
      {
        type: "toggle",
        name: "includeInfra",
        message: "Include infra folder (migrations / rules)?",
        initial: flags.includeInfra ?? true,
        active: "yes",
        inactive: "no",
      },
      {
        type: "text",
        name: "bundleVendor",
        message: "Mobile bundle ID prefix (e.g. com.yourname)",
        initial: flags.bundleVendor ?? "com.example",
      },
      {
        type: "toggle",
        name: "initGit",
        message: "Initialize a git repo in each subfolder?",
        initial: flags.initGit ?? true,
        active: "yes",
        inactive: "no",
      },
      {
        type: (_: unknown, values: { initGit: boolean }) => (values.initGit ? "toggle" : null),
        name: "createGithubRepos",
        message: "Create private GitHub repos via gh CLI?",
        initial: flags.createGithubRepos ?? false,
        active: "yes",
        inactive: "no",
      },
    ],
    { onCancel }
  );

  if (!answers.projectName) return null;

  return buildScaffoldConfig({
    projectName: answers.projectName.trim(),
    description: answers.description,
    dataStack: answers.dataStack,
    backend: answers.backend,
    website: answers.website,
    admin: answers.adminPanel ? "nextjs" : "none",
    mobile: answers.mobile ? "flutter" : "none",
    includeInfra: answers.includeInfra,
    initGit: answers.initGit,
    createGithubRepos: !!answers.createGithubRepos,
    githubVisibility: flags.githubVisibility ?? "private",
    bundleVendor: answers.bundleVendor || "com.example",
    out: flags.out,
  });
}
