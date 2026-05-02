import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildSaasProjectConfig,
  writeSaasConfig,
  SaasProjectConfigSchema,
  type ScaffoldConfig,
  type TemplateMeta,
} from "../src/index.js";

function fakeConfig(): ScaffoldConfig {
  return {
    projectName: "Acme",
    projectKebab: "acme",
    projectSnake: "acme",
    projectPascal: "Acme",
    bundleId: "com.acme.app",
    description: "test",
    destDir: "/tmp/acme",
    dataStack: "supabase",
    backend: "fastapi",
    website: "nextjs",
    adminPanel: "nextjs",
    mobile: "none",
    includeInfra: true,
    initGit: true,
    createGithubRepos: false,
    githubVisibility: "private",
  };
}

const fakeMeta = (name: string, role: TemplateMeta["role"], version = "1.0.0"): TemplateMeta => ({
  name,
  role,
  displayName: name,
  language: "typescript",
  supports: ["supabase"],
  folderSuffix: role,
  version,
});

describe("buildSaasProjectConfig", () => {
  it("captures composition and template versions, omits scaffolding-time intent", () => {
    const cfg = fakeConfig();
    const out = buildSaasProjectConfig(
      cfg,
      [
        { meta: fakeMeta("backend-fastapi", "backend", "1.2.3"), destFolderName: "acme-backend" },
        { meta: fakeMeta("website-nextjs", "website"), destFolderName: "acme-website" },
      ],
      "0.5.0"
    );
    expect(out.schemaVersion).toBe(1);
    expect(out.cliVersion).toBe("0.5.0");
    expect(out.project.name).toBe("Acme");
    expect(out.project.bundleId).toBe("com.acme.app");
    expect(out.composition.dataStack).toBe("supabase");
    expect(out.composition.includeInfra).toBe(true);
    expect(out.templates).toHaveLength(2);
    expect(out.templates[0]).toEqual({
      name: "backend-fastapi",
      role: "backend",
      version: "1.2.3",
      folder: "acme-backend",
    });
    // No initGit, createGithubRepos, githubVisibility, destDir leaked.
    expect(out).not.toHaveProperty("initGit");
    expect(out).not.toHaveProperty("destDir");
  });

  it("falls back to 0.0.0 for templates without a declared version", () => {
    const meta: TemplateMeta = {
      name: "x", role: "backend", displayName: "X",
      language: "typescript", supports: ["supabase"], folderSuffix: "backend",
    };
    const out = buildSaasProjectConfig(fakeConfig(), [{ meta, destFolderName: "x" }], "0.1.0");
    expect(out.templates[0].version).toBe("0.0.0");
  });

  it("round-trips through SaasProjectConfigSchema", () => {
    const out = buildSaasProjectConfig(
      fakeConfig(),
      [{ meta: fakeMeta("backend-fastapi", "backend"), destFolderName: "acme-backend" }],
      "0.1.0"
    );
    expect(() => SaasProjectConfigSchema.parse(out)).not.toThrow();
  });
});

describe("writeSaasConfig", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await fs.mkdtemp(path.join(os.tmpdir(), "saascfg-")); });
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

  it("writes valid JSON to saas.config.json", async () => {
    const cfg = buildSaasProjectConfig(
      fakeConfig(),
      [{ meta: fakeMeta("backend-fastapi", "backend"), destFolderName: "acme-backend" }],
      "0.1.0"
    );
    const filePath = await writeSaasConfig(tmp, cfg);
    expect(filePath).toBe(path.join(tmp, "saas.config.json"));
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.project.name).toBe("Acme");
    expect(parsed.templates[0].name).toBe("backend-fastapi");
  });
});
