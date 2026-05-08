import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  scaffold,
  updateProject,
  loadSaasConfig,
  type ScaffoldConfig,
} from "../../src/index.js";
import { workspaceRoot } from "../helpers/workspace-root.js";
import { copyDir } from "../../src/fs.js";

/**
 * The update command needs two snapshots of the same template — one
 * representing what the user got at scaffold time (v1.0.0) and one
 * representing the current published version (v1.1.0). We build the v1.1.0
 * snapshot at runtime by copying the real template and bumping its version
 * + adding a migration file.
 */
async function buildBumpedTemplatesRoot(realTemplatesRoot: string, dest: string): Promise<void> {
  // Copy every template directory into `dest`.
  const entries = await fs.readdir(realTemplatesRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    await copyDir(path.join(realTemplatesRoot, entry.name), path.join(dest, entry.name));
  }

  // Bump backend-fastapi to 1.1.0 and add a migration that touches its README.
  const backendDir = path.join(dest, "backend-fastapi");
  const metaPath = path.join(backendDir, "_template.json");
  const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
  meta.version = "1.1.0";
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8");

  // Migration: replace one line in README, add one new file.
  const migrationsDir = path.join(backendDir, "migrations");
  await fs.mkdir(path.join(migrationsDir, "files"), { recursive: true });
  const migration = {
    id: "1.0.0_to_1.1.0",
    from: "1.0.0",
    to: "1.1.0",
    description: "Add MIGRATION_TEST.md and tweak README",
    ops: [
      { type: "addFile", path: "MIGRATION_TEST.md", source: "MIGRATION_TEST.md" },
      { type: "replaceText", path: "README.md", find: "FastAPI", replace: "FastAPI (post-update)" },
    ],
  };
  await fs.writeFile(
    path.join(migrationsDir, "1.0.0_to_1.1.0.json"),
    JSON.stringify(migration, null, 2),
    "utf8"
  );
  await fs.writeFile(
    path.join(migrationsDir, "files", "MIGRATION_TEST.md"),
    "# Added by 1.0.0 → 1.1.0\n",
    "utf8"
  );
}

const REAL_TEMPLATES = path.join(workspaceRoot(), "templates");
const REAL_INFRA = path.join(workspaceRoot(), "infra");

function smokeConfig(destDir: string): ScaffoldConfig {
  return {
    projectName: "Update Test",
    projectKebab: "update-test",
    projectSnake: "update_test",
    projectPascal: "UpdateTest",
    bundleId: "com.example.updatetest",
    description: "update command test",
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

describe("updateProject (e2e)", () => {
  let tmp: string;
  let bumped: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "lifecycle-update-"));
    bumped = await fs.mkdtemp(path.join(os.tmpdir(), "lifecycle-update-tpl-"));
    await buildBumpedTemplatesRoot(REAL_TEMPLATES, bumped);
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
    await fs.rm(bumped, { recursive: true, force: true });
  });

  it("returns no changes when versions already match", async () => {
    const dest = path.join(tmp, "update-test");
    await scaffold(smokeConfig(dest), { templatesRoot: REAL_TEMPLATES, infraRoot: REAL_INFRA, cliVersion: "0.3.0" });

    // Re-run against the same templates root → no version bump anywhere.
    const result = await updateProject({
      projectDir: dest,
      templatesRoot: REAL_TEMPLATES,
      infraRoot: REAL_INFRA,
    });
    expect(result.changed).toBe(false);
    expect(result.outcomes).toHaveLength(0);
  });

  it("dry-run produces a plan but doesn't touch disk", async () => {
    const dest = path.join(tmp, "update-test");
    await scaffold(smokeConfig(dest), { templatesRoot: REAL_TEMPLATES, infraRoot: REAL_INFRA, cliVersion: "0.3.0" });

    const result = await updateProject({
      projectDir: dest,
      templatesRoot: bumped,
      infraRoot: REAL_INFRA,
      dryRun: true,
    });
    expect(result.dryRun).toBe(true);
    expect(result.plans).toHaveLength(1);
    expect(result.plans[0].template).toBe("backend-fastapi");
    expect(result.plans[0].fromVersion).toBe("1.0.0");
    expect(result.plans[0].toVersion).toBe("1.1.0");
    expect(result.plans[0].migrations.map((m) => m.id)).toEqual(["1.0.0_to_1.1.0"]);
    expect(result.outcomes).toHaveLength(0);

    // Disk untouched.
    await expect(fs.access(path.join(dest, "update-test-backend", "MIGRATION_TEST.md"))).rejects.toThrow();
    const config = await loadSaasConfig(dest);
    expect(config.templates[0].version).toBe("1.0.0");
    expect(config.templates[0].appliedMigrations).toEqual([]);
  });

  it("applies migrations end-to-end and records them in saas.config.json", async () => {
    const dest = path.join(tmp, "update-test");
    await scaffold(smokeConfig(dest), { templatesRoot: REAL_TEMPLATES, infraRoot: REAL_INFRA, cliVersion: "0.3.0" });

    const result = await updateProject({
      projectDir: dest,
      templatesRoot: bumped,
      infraRoot: REAL_INFRA,
    });
    expect(result.changed).toBe(true);
    expect(result.outcomes).toHaveLength(1);
    expect(result.outcomes[0].appliedMigrationIds).toEqual(["1.0.0_to_1.1.0"]);
    expect(result.outcomes[0].conflicts).toEqual([]);

    // The addFile op materialized.
    const added = await fs.readFile(path.join(dest, "update-test-backend", "MIGRATION_TEST.md"), "utf8");
    expect(added).toMatch(/Added by 1\.0\.0 → 1\.1\.0/);

    // The replaceText op landed.
    const readme = await fs.readFile(path.join(dest, "update-test-backend", "README.md"), "utf8");
    expect(readme).toMatch(/FastAPI \(post-update\)/);

    // saas.config.json reflects the new state.
    const after = await loadSaasConfig(dest);
    expect(after.templates[0].version).toBe("1.1.0");
    expect(after.templates[0].appliedMigrations).toEqual(["1.0.0_to_1.1.0"]);
  });

  it("is idempotent: a second update is a no-op", async () => {
    const dest = path.join(tmp, "update-test");
    await scaffold(smokeConfig(dest), { templatesRoot: REAL_TEMPLATES, infraRoot: REAL_INFRA, cliVersion: "0.3.0" });

    await updateProject({ projectDir: dest, templatesRoot: bumped, infraRoot: REAL_INFRA });
    const second = await updateProject({ projectDir: dest, templatesRoot: bumped, infraRoot: REAL_INFRA });

    expect(second.changed).toBe(false);
    expect(second.outcomes).toHaveLength(0);
  });

  it("flags a replaceText conflict when the user has edited the targeted snippet", async () => {
    const dest = path.join(tmp, "update-test");
    await scaffold(smokeConfig(dest), { templatesRoot: REAL_TEMPLATES, infraRoot: REAL_INFRA, cliVersion: "0.3.0" });

    // Wipe the README so the migration's `find: "FastAPI"` won't match.
    const readme = path.join(dest, "update-test-backend", "README.md");
    await fs.writeFile(readme, "user wrote this\n", "utf8");

    const result = await updateProject({ projectDir: dest, templatesRoot: bumped, infraRoot: REAL_INFRA });
    expect(result.outcomes[0].conflicts).toHaveLength(1);
    expect(result.outcomes[0].conflicts[0].kind).toBe("replaceText_findNotFound");

    // Companion file written.
    const companion = await fs.readFile(readme + ".update-conflict", "utf8");
    expect(companion).toMatch(/Unapplied template patch/);

    // Even with conflicts, version + appliedMigrations advance — the user
    // has the conflict file to resolve, but the migration itself is logged
    // as applied. Re-running won't try the same patch twice.
    const after = await loadSaasConfig(dest);
    expect(after.templates[0].version).toBe("1.1.0");
    expect(after.templates[0].appliedMigrations).toEqual(["1.0.0_to_1.1.0"]);
  });
});
