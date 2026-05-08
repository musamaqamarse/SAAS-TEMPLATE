import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  scaffold,
  addApp,
  loadSaasConfig,
  type ScaffoldConfig,
} from "../../src/index.js";
import { workspaceRoot } from "../helpers/workspace-root.js";

const OPTIONS = {
  templatesRoot: path.join(workspaceRoot(), "templates"),
  infraRoot: path.join(workspaceRoot(), "infra"),
  cliVersion: "0.3.0-test",
};

function backendOnlyConfig(destDir: string): ScaffoldConfig {
  return {
    projectName: "Add Test",
    projectKebab: "add-test",
    projectSnake: "add_test",
    projectPascal: "AddTest",
    bundleId: "com.example.addtest",
    description: "add command test",
    destDir,
    dataStack: "supabase",
    backend: "fastapi",
    website: "none",
    adminPanel: "none",
    mobile: "none",
    includeInfra: false,
    initGit: false,
    createGithubRepos: false,
    githubVisibility: "private",
  };
}

describe("addApp (e2e)", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "lifecycle-add-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("adds an admin panel folder + records it in saas.config.json", async () => {
    const dest = path.join(tmp, "add-test");
    await scaffold(backendOnlyConfig(dest), OPTIONS);

    // Sanity: admin not present yet.
    const before = await loadSaasConfig(dest);
    expect(before.composition.adminPanel).toBe("none");

    const result = await addApp({
      projectDir: dest,
      role: "adminpanel",
      // adminpanel only has one variant; --variant is optional.
      templatesRoot: OPTIONS.templatesRoot,
      infraRoot: OPTIONS.infraRoot,
    });

    expect(result.templateName).toBe("adminpanel-nextjs");
    expect(path.basename(result.destFolder)).toBe("add-test-adminpanel");

    const folders = await fs.readdir(dest);
    expect(folders).toContain("add-test-adminpanel");

    // saas.config.json reflects the new state.
    const after = await loadSaasConfig(dest);
    expect(after.composition.adminPanel).toBe("nextjs");
    const entry = after.templates.find((t) => t.role === "adminpanel");
    expect(entry).toBeTruthy();
    expect(entry?.name).toBe("adminpanel-nextjs");
    expect(entry?.appliedMigrations).toEqual([]);

    // Agent rules updated.
    const claude = await fs.readFile(path.join(dest, "CLAUDE.md"), "utf8");
    expect(claude).toMatch(/-p 3001/);
  });

  it("requires --variant when the role has multiple variants", async () => {
    const dest = path.join(tmp, "add-test");
    await scaffold(backendOnlyConfig(dest), OPTIONS);

    await expect(
      addApp({
        projectDir: dest,
        role: "website",
        // no variant on a role with two options
        templatesRoot: OPTIONS.templatesRoot,
        infraRoot: OPTIONS.infraRoot,
      })
    ).rejects.toThrow(/multiple variants/);
  });

  it("accepts --variant for a role with multiple variants", async () => {
    const dest = path.join(tmp, "add-test");
    await scaffold(backendOnlyConfig(dest), OPTIONS);

    const result = await addApp({
      projectDir: dest,
      role: "website",
      variant: "reactjs",
      templatesRoot: OPTIONS.templatesRoot,
      infraRoot: OPTIONS.infraRoot,
    });
    expect(result.templateName).toBe("website-reactjs");

    const after = await loadSaasConfig(dest);
    expect(after.composition.website).toBe("reactjs");
  });

  it("refuses when the role is already configured", async () => {
    const dest = path.join(tmp, "add-test");
    await scaffold(backendOnlyConfig(dest), OPTIONS);

    await expect(
      addApp({
        projectDir: dest,
        role: "backend",
        variant: "fastapi",
        templatesRoot: OPTIONS.templatesRoot,
        infraRoot: OPTIONS.infraRoot,
      })
    ).rejects.toThrow(/already configured/);
  });

  it("refuses when the destination folder already exists", async () => {
    const dest = path.join(tmp, "add-test");
    await scaffold(backendOnlyConfig(dest), OPTIONS);

    // Pre-create the target folder.
    await fs.mkdir(path.join(dest, "add-test-adminpanel"));

    await expect(
      addApp({
        projectDir: dest,
        role: "adminpanel",
        templatesRoot: OPTIONS.templatesRoot,
        infraRoot: OPTIONS.infraRoot,
      })
    ).rejects.toThrow(/already exists/);
  });

  it("rejects an unsupported variant", async () => {
    const dest = path.join(tmp, "add-test");
    await scaffold(backendOnlyConfig(dest), OPTIONS);

    await expect(
      addApp({
        projectDir: dest,
        role: "website",
        variant: "vue",
        templatesRoot: OPTIONS.templatesRoot,
        infraRoot: OPTIONS.infraRoot,
      })
    ).rejects.toThrow(/Unknown variant/);
  });

  it("round-trips: add then remove leaves the project in its original state for that role", async () => {
    const { removeApp } = await import("../../src/index.js");
    const dest = path.join(tmp, "add-test");
    await scaffold(backendOnlyConfig(dest), OPTIONS);

    await addApp({
      projectDir: dest,
      role: "adminpanel",
      templatesRoot: OPTIONS.templatesRoot,
      infraRoot: OPTIONS.infraRoot,
    });
    await removeApp({
      projectDir: dest,
      role: "adminpanel",
      templatesRoot: OPTIONS.templatesRoot,
      infraRoot: OPTIONS.infraRoot,
    });

    const after = await loadSaasConfig(dest);
    expect(after.composition.adminPanel).toBe("none");
    expect(after.templates.find((t) => t.role === "adminpanel")).toBeUndefined();
    const folders = await fs.readdir(dest);
    expect(folders).not.toContain("add-test-adminpanel");
  });
});
