import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyReplacements, buildReplacements, processTreePlaceholders } from "../src/placeholders.js";
import type { ScaffoldConfig } from "../src/schemas.js";

function fakeConfig(overrides: Partial<ScaffoldConfig> = {}): ScaffoldConfig {
  return {
    projectName: "My Cool App",
    projectKebab: "my-cool-app",
    projectSnake: "my_cool_app",
    projectPascal: "MyCoolApp",
    bundleId: "com.acme.mycoolapp",
    description: "A new SaaS",
    destDir: "/tmp/x",
    dataStack: "supabase",
    backend: "fastapi",
    website: "nextjs",
    adminPanel: "nextjs",
    mobile: "flutter",
    includeInfra: true,
    initGit: false,
    createGithubRepos: false,
    githubVisibility: "private",
    ...overrides,
  };
}

describe("buildReplacements / applyReplacements", () => {
  it("substitutes all six tokens", () => {
    const cfg = fakeConfig();
    const reps = buildReplacements(cfg);
    const input = `name=__PROJECT_NAME__ kebab=__PROJECT_KEBAB__ snake=__PROJECT_SNAKE__ pascal=__PROJECT_PASCAL__ bundle=__BUNDLE_ID__ desc=__DESCRIPTION__`;
    const out = applyReplacements(input, reps);
    expect(out).toBe("name=My Cool App kebab=my-cool-app snake=my_cool_app pascal=MyCoolApp bundle=com.acme.mycoolapp desc=A new SaaS");
  });

  it("replaces every occurrence (global)", () => {
    const reps = buildReplacements(fakeConfig());
    expect(applyReplacements("__PROJECT_KEBAB__-__PROJECT_KEBAB__", reps)).toBe("my-cool-app-my-cool-app");
  });

  it("leaves unrelated text untouched", () => {
    const reps = buildReplacements(fakeConfig());
    expect(applyReplacements("hello world", reps)).toBe("hello world");
  });
});

describe("processTreePlaceholders", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ph-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("rewrites text file contents", async () => {
    const file = path.join(tmp, "README.md");
    await fs.writeFile(file, "# __PROJECT_NAME__\n\n__DESCRIPTION__");
    await processTreePlaceholders(tmp, fakeConfig());
    const out = await fs.readFile(file, "utf8");
    expect(out).toBe("# My Cool App\n\nA new SaaS");
  });

  it("renames files containing tokens", async () => {
    await fs.writeFile(path.join(tmp, "__PROJECT_KEBAB__.config.js"), "module.exports = {};");
    await processTreePlaceholders(tmp, fakeConfig());
    const entries = await fs.readdir(tmp);
    expect(entries).toContain("my-cool-app.config.js");
  });

  it("renames directories containing tokens and recurses", async () => {
    const dir = path.join(tmp, "src", "__PROJECT_SNAKE__");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "main.py"), "# package __PROJECT_SNAKE__");
    await processTreePlaceholders(tmp, fakeConfig());
    const renamed = path.join(tmp, "src", "my_cool_app");
    const content = await fs.readFile(path.join(renamed, "main.py"), "utf8");
    expect(content).toBe("# package my_cool_app");
  });

  it("does not corrupt binary-extension files", async () => {
    const png = path.join(tmp, "logo.png");
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await fs.writeFile(png, bytes);
    await processTreePlaceholders(tmp, fakeConfig());
    const after = await fs.readFile(png);
    expect(after.equals(bytes)).toBe(true);
  });
});
