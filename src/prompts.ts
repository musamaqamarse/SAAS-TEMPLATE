import path from "node:path";
import process from "node:process";
import prompts from "prompts";
import pc from "picocolors";
import { ScaffoldConfig } from "./types.js";
import { toBundleId, toKebab, toPascal, toSnake } from "./utils.js";

function onCancel() {
  console.log(pc.yellow("Cancelled."));
  process.exit(1);
}

export async function runPrompts(projectArg: string | undefined): Promise<ScaffoldConfig | null> {
  const initialName = projectArg ?? "";

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
        initial: "A new SaaS project",
      },
      {
        type: "select",
        name: "dataStack",
        message: "Data / auth / storage stack",
        choices: [
          { title: "Supabase", value: "supabase" },
          { title: "Firebase", value: "firebase" },
        ],
        initial: 0,
      },
      {
        type: "select",
        name: "backend",
        message: "Backend",
        choices: [
          { title: "FastAPI (Python)", value: "fastapi" },
          { title: "Next.js API routes", value: "nextjs-api" },
          { title: "None (use data stack directly from clients)", value: "none" },
        ],
        initial: 0,
      },
      {
        type: "select",
        name: "website",
        message: "Marketing / app website",
        choices: [
          { title: "Next.js (App Router)", value: "nextjs" },
          { title: "React + Vite", value: "reactjs" },
          { title: "None", value: "none" },
        ],
        initial: 0,
      },
      {
        type: "toggle",
        name: "adminPanel",
        message: "Include admin panel (Next.js)?",
        initial: true,
        active: "yes",
        inactive: "no",
      },
      {
        type: "toggle",
        name: "mobile",
        message: "Include Flutter mobile app?",
        initial: true,
        active: "yes",
        inactive: "no",
      },
      {
        type: "toggle",
        name: "includeInfra",
        message: "Include infra folder (migrations / rules)?",
        initial: true,
        active: "yes",
        inactive: "no",
      },
      {
        type: "text",
        name: "bundleVendor",
        message: "Mobile bundle ID prefix (e.g. com.yourname)",
        initial: "com.example",
      },
      {
        type: "toggle",
        name: "initGit",
        message: "Initialize a git repo in each subfolder?",
        initial: true,
        active: "yes",
        inactive: "no",
      },
      {
        type: (_: unknown, values: { initGit: boolean }) => (values.initGit ? "toggle" : null),
        name: "createGithubRepos",
        message: "Create private GitHub repos via gh CLI?",
        initial: false,
        active: "yes",
        inactive: "no",
      },
    ],
    { onCancel }
  );

  if (!answers.projectName) return null;

  const projectName: string = answers.projectName.trim();
  const projectKebab = toKebab(projectName);
  const projectSnake = toSnake(projectName);
  const projectPascal = toPascal(projectName);
  const bundleId = toBundleId(projectKebab, answers.bundleVendor || "com.example");
  const destDir = path.resolve(process.cwd(), projectKebab);

  return {
    projectName,
    projectKebab,
    projectSnake,
    projectPascal,
    bundleId,
    description: answers.description,
    destDir,
    dataStack: answers.dataStack,
    backend: answers.backend,
    website: answers.website,
    adminPanel: answers.adminPanel ? "nextjs" : "none",
    mobile: answers.mobile ? "flutter" : "none",
    includeInfra: answers.includeInfra,
    initGit: answers.initGit,
    createGithubRepos: !!answers.createGithubRepos,
    githubVisibility: "private",
  };
}
