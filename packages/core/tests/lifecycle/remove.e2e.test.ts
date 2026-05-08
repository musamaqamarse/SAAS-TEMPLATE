import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  scaffold,
  removeApp,
  loadSaasConfig,
  type ScaffoldConfig,
} from "../../src/index.js";
import { workspaceRoot } from "../helpers/workspace-root.js";

const OPTIONS = {
  templatesRoot: path.join(workspaceRoot(), "templates"),
  infraRoot: path.join(workspaceRoot(), "infra"),
  cliVersion: "0.3.0-test",
};

function fullStackConfig(destDir: string): ScaffoldConfig {
  return {
    projectName: "Lifecycle Test",
    projectKebab: "lifecycle-test",
    projectSnake: "lifecycle_test",
    projectPascal: "LifecycleTest",
    bundleId: "com.example.lifecycletest",
    description: "lifecycle test scaffold",
    destDir,
    dataStack: "supabase",
    backend: "fastapi",
    website: "nextjs",
    adminPanel: "nextjs",
    mobile: "none",
    includeInfra: false,
    initGit: false,
    createGithubRepos: false,
    githubVisibility: "private",
  };
}

describe("removeApp (e2e)", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "lifecycle-remove-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("removes the role's folder and updates saas.config.json", async () => {
    const dest = path.join(tmp, "lifecycle-test");
    await scaffold(fullStackConfig(dest), OPTIONS);

    // Sanity: adminpanel folder + entry exist beforehand.
    const beforeFolders = await fs.readdir(dest);
    expect(beforeFolders).toContain("lifecycle-test-adminpanel");
    const before = await loadSaasConfig(dest);
    expect(before.composition.adminPanel).toBe("nextjs");
    expect(before.templates.find((t) => t.role === "adminpanel")).toBeTruthy();

    const result = await removeApp({
      projectDir: dest,
      role: "adminpanel",
      templatesRoot: OPTIONS.templatesRoot,
      infraRoot: OPTIONS.infraRoot,
    });

    expect(result.removedTemplate).toBe("adminpanel-nextjs");
    expect(path.basename(result.removedFolder)).toBe("lifecycle-test-adminpanel");

    // Folder gone.
    const afterFolders = await fs.readdir(dest);
    expect(afterFolders).not.toContain("lifecycle-test-adminpanel");

    // saas.config.json updated.
    const after = await loadSaasConfig(dest);
    expect(after.composition.adminPanel).toBe("none");
    expect(after.templates.find((t) => t.role === "adminpanel")).toBeUndefined();
    // The remaining roles are still recorded.
    expect(after.templates.find((t) => t.role === "backend")).toBeTruthy();
    expect(after.templates.find((t) => t.role === "website")).toBeTruthy();
  });

  it("refreshes agent rules and records the new hash when the user hasn't drifted them", async () => {
    const dest = path.join(tmp, "lifecycle-test");
    await scaffold(fullStackConfig(dest), OPTIONS);

    const before = await loadSaasConfig(dest);
    const oldHash = before.agentRulesHash;
    expect(oldHash).toBeTruthy();

    const result = await removeApp({
      projectDir: dest,
      role: "adminpanel",
      templatesRoot: OPTIONS.templatesRoot,
      infraRoot: OPTIONS.infraRoot,
    });
    expect(result.agentRulesDrifted).toBe(false);

    // Hash should change because the rules content changed.
    const after = await loadSaasConfig(dest);
    expect(after.agentRulesHash).toBeTruthy();
    expect(after.agentRulesHash).not.toBe(oldHash);

    // CLAUDE.md no longer has the admin-panel block (the `pnpm dev -- -p 3001`
    // line is unique to the active block; the "Admin panel: **none**" stack
    // summary line is still allowed).
    const claude = await fs.readFile(path.join(dest, "CLAUDE.md"), "utf8");
    expect(claude).not.toMatch(/-p 3001/);
    expect(claude).toMatch(/Admin panel: \*\*none\*\*/);
  });

  it("writes .new files instead of overwriting when the user has hand-edited agent rules", async () => {
    const dest = path.join(tmp, "lifecycle-test");
    await scaffold(fullStackConfig(dest), OPTIONS);

    // Simulate a hand edit that breaks the recorded hash.
    const claudePath = path.join(dest, "CLAUDE.md");
    await fs.appendFile(claudePath, "\n\n<!-- user notes -->\n", "utf8");

    const result = await removeApp({
      projectDir: dest,
      role: "adminpanel",
      templatesRoot: OPTIONS.templatesRoot,
      infraRoot: OPTIONS.infraRoot,
    });
    expect(result.agentRulesDrifted).toBe(true);

    // The original file is untouched (still contains the user notes).
    const claudeAfter = await fs.readFile(claudePath, "utf8");
    expect(claudeAfter).toMatch(/user notes/);

    // The .new sibling exists with the freshly rendered content (no admin
    // block, no user notes).
    const claudeNew = await fs.readFile(path.join(dest, "CLAUDE.md.new"), "utf8");
    expect(claudeNew).not.toMatch(/-p 3001/);
    expect(claudeNew).not.toMatch(/user notes/);
  });

  it("refuses to remove a role that isn't configured", async () => {
    const dest = path.join(tmp, "lifecycle-test");
    await scaffold(fullStackConfig(dest), OPTIONS);
    await expect(
      removeApp({
        projectDir: dest,
        role: "mobileapp", // never added
        templatesRoot: OPTIONS.templatesRoot,
        infraRoot: OPTIONS.infraRoot,
      })
    ).rejects.toThrow(/No mobileapp configured/);
  });

  it("errors clearly when run outside a scaffolded project", async () => {
    await expect(
      removeApp({
        projectDir: tmp, // empty dir, no saas.config.json
        role: "backend",
        templatesRoot: OPTIONS.templatesRoot,
        infraRoot: OPTIONS.infraRoot,
      })
    ).rejects.toThrow(/saas\.config\.json/);
  });
});
