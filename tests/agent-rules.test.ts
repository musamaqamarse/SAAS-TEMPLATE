import { describe, expect, it } from "vitest";
import { renderAgentRules, type ScaffoldConfig, type TemplateMeta } from "../src/core/index.js";

const meta = (name: string, displayName: string, role: TemplateMeta["role"]): TemplateMeta => ({
  name, displayName, role,
  language: "typescript",
  supports: ["supabase"],
  folderSuffix: role,
  version: "1.0.0",
});

const cfg = (overrides: Partial<ScaffoldConfig> = {}): ScaffoldConfig => ({
  projectName: "Acme",
  projectKebab: "acme",
  projectSnake: "acme",
  projectPascal: "Acme",
  bundleId: "com.acme.app",
  description: "An Acme project",
  destDir: "/tmp/acme",
  dataStack: "supabase",
  backend: "fastapi",
  website: "nextjs",
  adminPanel: "nextjs",
  mobile: "flutter",
  includeInfra: true,
  initGit: true,
  createGithubRepos: false,
  githubVisibility: "private",
  ...overrides,
});

describe("renderAgentRules", () => {
  it("includes the project name and description", () => {
    const out = renderAgentRules(cfg(), []);
    expect(out).toContain("# Acme");
    expect(out).toContain("An Acme project");
  });

  it("documents the chosen stack at a glance", () => {
    const out = renderAgentRules(cfg({ dataStack: "firebase", backend: "nextjs-api", website: "reactjs" }), []);
    expect(out).toMatch(/Data stack: \*\*firebase\*\*/);
    expect(out).toMatch(/Backend: \*\*nextjs-api\*\*/);
    expect(out).toMatch(/Website: \*\*reactjs\*\*/);
  });

  it("emits a backend section matching the choice", () => {
    expect(renderAgentRules(cfg({ backend: "fastapi" }), [])).toContain("FastAPI");
    expect(renderAgentRules(cfg({ backend: "nextjs-api" }), [])).toContain("Next.js API routes");
    expect(renderAgentRules(cfg({ backend: "none" }), [])).not.toMatch(/Backend — /);
  });

  it("includes a ports table only when there are apps with known ports", () => {
    const withApps = renderAgentRules(cfg(), [
      { meta: meta("backend-fastapi", "FastAPI Backend", "backend"), destFolderName: "acme-backend" },
      { meta: meta("website-nextjs", "Next.js Website", "website"), destFolderName: "acme-website" },
    ]);
    expect(withApps).toContain("## Ports");
    expect(withApps).toContain("FastAPI Backend");
    expect(withApps).toContain("8000");

    const noApps = renderAgentRules(cfg({ backend: "none", website: "none", adminPanel: "none", mobile: "none" }), []);
    expect(noApps).not.toContain("## Ports");
  });

  it("calls out the Supabase vs Firebase data stack", () => {
    expect(renderAgentRules(cfg({ dataStack: "supabase" }), [])).toContain("Supabase");
    expect(renderAgentRules(cfg({ dataStack: "firebase" }), [])).toContain("Firebase");
  });

  it("mentions the bundle ID for mobile", () => {
    expect(renderAgentRules(cfg(), [])).toContain("com.acme.app");
  });
});
