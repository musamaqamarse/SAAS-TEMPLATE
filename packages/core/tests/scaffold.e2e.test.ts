import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scaffold, type ScaffoldConfig } from "../src/index.js";
import { workspaceRoot } from "./helpers/workspace-root.js";

const OPTIONS = {
  templatesRoot: path.join(workspaceRoot(), "templates"),
  infraRoot: path.join(workspaceRoot(), "infra"),
  cliVersion: "0.1.0-test",
};

function makeConfig(destDir: string, dataStack: "supabase" | "firebase"): ScaffoldConfig {
  return {
    projectName: "Smoke Test",
    projectKebab: "smoke-test",
    projectSnake: "smoke_test",
    projectPascal: "SmokeTest",
    bundleId: "com.example.smoketest",
    description: "smoke test scaffold",
    destDir,
    dataStack,
    backend: "fastapi",
    website: "nextjs",
    adminPanel: "nextjs",
    mobile: "none",
    includeInfra: true,
    initGit: false,
    createGithubRepos: false,
    githubVisibility: "private",
  };
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string, prefix: string) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(path.join(d, e.name), rel);
      else out.push(rel);
    }
  }
  await walk(dir, "");
  return out;
}

describe("scaffold (e2e smoke)", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "scaffold-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("scaffolds backend + website + adminpanel + infra for Supabase", async () => {
    const dest = path.join(tmp, "smoke-test");
    const result = await scaffold(makeConfig(dest, "supabase"), OPTIONS);

    const subfolders = await fs.readdir(dest);
    expect(subfolders).toContain("smoke-test-backend");
    expect(subfolders).toContain("smoke-test-website");
    expect(subfolders).toContain("smoke-test-adminpanel");
    expect(subfolders).toContain("smoke-test-infra");
    expect(subfolders).toContain("saas.config.json");
    expect(subfolders).toContain("CLAUDE.md");
    expect(subfolders).toContain("agents.md");
    expect(subfolders).toContain(".cursorrules");

    const files = await listFilesRecursive(dest);
    const allText = files.join("\n");
    expect(allText).not.toMatch(/__PROJECT_NAME__/);
    expect(allText).not.toMatch(/__PROJECT_KEBAB__/);
    expect(allText).not.toMatch(/__BUNDLE_ID__/);

    expect(result.scaffolded.length).toBeGreaterThan(0);
    expect(result.saasConfigPath.endsWith("saas.config.json")).toBe(true);
  });

  it("scaffolds backend + website + adminpanel + infra for Firebase", async () => {
    const dest = path.join(tmp, "smoke-test-fb");
    await scaffold(makeConfig(dest, "firebase"), OPTIONS);

    const subfolders = await fs.readdir(dest);
    expect(subfolders).toContain("smoke-test-backend");
    expect(subfolders).toContain("smoke-test-website");
    expect(subfolders).toContain("smoke-test-adminpanel");
    expect(subfolders).toContain("smoke-test-infra");

    const files = await listFilesRecursive(dest);
    const allText = files.join("\n");
    expect(allText).not.toMatch(/__PROJECT_NAME__/);
    expect(allText).not.toMatch(/__BUNDLE_ID__/);
  });

  it("refuses to scaffold into a non-empty destination", async () => {
    const dest = path.join(tmp, "occupied");
    await fs.mkdir(dest, { recursive: true });
    await fs.writeFile(path.join(dest, "preexisting.txt"), "hi");
    await expect(scaffold(makeConfig(dest, "supabase"), OPTIONS)).rejects.toThrow(/not empty/);
  });

  it("rejects no-apps configurations", async () => {
    const dest = path.join(tmp, "empty");
    const cfg = makeConfig(dest, "supabase");
    cfg.backend = "none";
    cfg.website = "none";
    cfg.adminPanel = "none";
    cfg.mobile = "none";
    cfg.includeInfra = false;
    await expect(scaffold(cfg, OPTIONS)).rejects.toThrow(/No apps selected/);
  });
});
