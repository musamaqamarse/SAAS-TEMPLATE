import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyMigration } from "../../src/migrations/apply.js";
import type { Migration } from "../../src/migrations/schema.js";

async function setupAppDir(seed: Record<string, string>): Promise<{ appDir: string; migrationDir: string; cleanup: () => Promise<void> }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mig-"));
  const appDir = path.join(root, "app");
  const migrationDir = path.join(root, "migration");
  await fs.mkdir(appDir, { recursive: true });
  await fs.mkdir(path.join(migrationDir, "files"), { recursive: true });

  for (const [rel, content] of Object.entries(seed)) {
    const full = path.join(appDir, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf8");
  }

  return { appDir, migrationDir, cleanup: () => fs.rm(root, { recursive: true, force: true }) };
}

function migration(ops: Migration["ops"]): Migration {
  return { id: "1.0.0_to_1.1.0", from: "1.0.0", to: "1.1.0", description: "test", ops };
}

describe("applyMigration ops", () => {
  let cleanup: () => Promise<void>;
  afterEach(async () => { await cleanup(); });

  describe("addFile", () => {
    it("creates a new file from the migration's files/ source", async () => {
      const t = await setupAppDir({}); cleanup = t.cleanup;
      await fs.writeFile(path.join(t.migrationDir, "files", "middleware.ts"), "export const x = 1;\n", "utf8");

      const result = await applyMigration(
        migration([{ type: "addFile", path: "src/middleware.ts", source: "middleware.ts" }]),
        { appDir: t.appDir, migrationDir: t.migrationDir }
      );

      expect(result.applied).toHaveLength(1);
      expect(result.conflicts).toHaveLength(0);
      const written = await fs.readFile(path.join(t.appDir, "src/middleware.ts"), "utf8");
      expect(written).toBe("export const x = 1;\n");
    });

    it("skips when target already exists with identical content", async () => {
      const t = await setupAppDir({ "x.ts": "same\n" }); cleanup = t.cleanup;
      await fs.writeFile(path.join(t.migrationDir, "files", "x.ts"), "same\n", "utf8");
      const result = await applyMigration(
        migration([{ type: "addFile", path: "x.ts", source: "x.ts" }]),
        { appDir: t.appDir, migrationDir: t.migrationDir }
      );
      expect(result.applied).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.conflicts).toHaveLength(0);
    });

    it("flags a conflict when target exists with different content", async () => {
      const t = await setupAppDir({ "x.ts": "user-edited\n" }); cleanup = t.cleanup;
      await fs.writeFile(path.join(t.migrationDir, "files", "x.ts"), "template-version\n", "utf8");
      const result = await applyMigration(
        migration([{ type: "addFile", path: "x.ts", source: "x.ts" }]),
        { appDir: t.appDir, migrationDir: t.migrationDir }
      );
      expect(result.applied).toHaveLength(0);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].kind).toBe("addFile_existsDifferent");
      // User's file untouched.
      expect(await fs.readFile(path.join(t.appDir, "x.ts"), "utf8")).toBe("user-edited\n");
    });
  });

  describe("deleteFile", () => {
    it("removes the file when present", async () => {
      const t = await setupAppDir({ "old.py": "stale\n" }); cleanup = t.cleanup;
      const result = await applyMigration(
        migration([{ type: "deleteFile", path: "old.py" }]),
        { appDir: t.appDir, migrationDir: t.migrationDir }
      );
      expect(result.applied).toHaveLength(1);
      await expect(fs.access(path.join(t.appDir, "old.py"))).rejects.toThrow();
    });

    it("skips silently when already missing", async () => {
      const t = await setupAppDir({}); cleanup = t.cleanup;
      const result = await applyMigration(
        migration([{ type: "deleteFile", path: "missing.py" }]),
        { appDir: t.appDir, migrationDir: t.migrationDir }
      );
      expect(result.applied).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
    });
  });

  describe("renameFile", () => {
    it("moves a file when target is free", async () => {
      const t = await setupAppDir({ "old.ts": "x\n" }); cleanup = t.cleanup;
      const result = await applyMigration(
        migration([{ type: "renameFile", from: "old.ts", to: "nested/new.ts" }]),
        { appDir: t.appDir, migrationDir: t.migrationDir }
      );
      expect(result.applied).toHaveLength(1);
      await expect(fs.access(path.join(t.appDir, "old.ts"))).rejects.toThrow();
      expect(await fs.readFile(path.join(t.appDir, "nested/new.ts"), "utf8")).toBe("x\n");
    });

    it("flags a conflict when target already exists", async () => {
      const t = await setupAppDir({ "old.ts": "x\n", "new.ts": "user\n" }); cleanup = t.cleanup;
      const result = await applyMigration(
        migration([{ type: "renameFile", from: "old.ts", to: "new.ts" }]),
        { appDir: t.appDir, migrationDir: t.migrationDir }
      );
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].kind).toBe("renameFile_targetExists");
      // Both files still present.
      expect(await fs.readFile(path.join(t.appDir, "old.ts"), "utf8")).toBe("x\n");
      expect(await fs.readFile(path.join(t.appDir, "new.ts"), "utf8")).toBe("user\n");
    });
  });

  describe("patchJson", () => {
    it("applies set / merge / unset", async () => {
      const t = await setupAppDir({
        "package.json": JSON.stringify({
          name: "x",
          version: "1.0.0",
          dependencies: { foo: "^1", bar: "^2" },
          scripts: { dev: "node ." },
        }),
      });
      cleanup = t.cleanup;

      const result = await applyMigration(
        migration([
          {
            type: "patchJson",
            path: "package.json",
            set: { version: "2.0.0" },
            merge: { dependencies: { foo: "^2", baz: "^3" } },
            unset: ["scripts.dev"],
          },
        ]),
        { appDir: t.appDir, migrationDir: t.migrationDir }
      );
      expect(result.applied).toHaveLength(1);

      const out = JSON.parse(await fs.readFile(path.join(t.appDir, "package.json"), "utf8"));
      expect(out.version).toBe("2.0.0");
      expect(out.dependencies.foo).toBe("^2");        // merged
      expect(out.dependencies.bar).toBe("^2");        // preserved
      expect(out.dependencies.baz).toBe("^3");        // added
      expect(out.scripts.dev).toBeUndefined();        // unset
    });

    it("flags a conflict when target JSON is invalid", async () => {
      const t = await setupAppDir({ "broken.json": "{ not json" }); cleanup = t.cleanup;
      const result = await applyMigration(
        migration([{ type: "patchJson", path: "broken.json", set: { x: 1 } }]),
        { appDir: t.appDir, migrationDir: t.migrationDir }
      );
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].kind).toBe("patchJson_invalid");
    });

    it("skips silently when file is missing", async () => {
      const t = await setupAppDir({}); cleanup = t.cleanup;
      const result = await applyMigration(
        migration([{ type: "patchJson", path: "absent.json", set: { x: 1 } }]),
        { appDir: t.appDir, migrationDir: t.migrationDir }
      );
      expect(result.skipped).toHaveLength(1);
    });
  });

  describe("replaceText", () => {
    it("replaces a literal substring when present", async () => {
      const t = await setupAppDir({ "main.py": 'app = FastAPI()\n' }); cleanup = t.cleanup;
      const result = await applyMigration(
        migration([{ type: "replaceText", path: "main.py", find: "FastAPI()", replace: 'FastAPI(title="X")' }]),
        { appDir: t.appDir, migrationDir: t.migrationDir }
      );
      expect(result.applied).toHaveLength(1);
      expect(await fs.readFile(path.join(t.appDir, "main.py"), "utf8")).toBe('app = FastAPI(title="X")\n');
    });

    it("writes a .update-conflict companion when find isn't matched", async () => {
      const t = await setupAppDir({ "main.py": "app = SomethingElse()\n" }); cleanup = t.cleanup;
      const result = await applyMigration(
        migration([{ type: "replaceText", path: "main.py", find: "FastAPI()", replace: 'FastAPI(title="X")' }]),
        { appDir: t.appDir, migrationDir: t.migrationDir }
      );
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].kind).toBe("replaceText_findNotFound");
      // Original file untouched.
      expect(await fs.readFile(path.join(t.appDir, "main.py"), "utf8")).toBe("app = SomethingElse()\n");
      // Companion exists.
      const companion = await fs.readFile(path.join(t.appDir, "main.py.update-conflict"), "utf8");
      expect(companion).toMatch(/Unapplied template patch/);
      expect(companion).toMatch(/FastAPI\(title="X"\)/);
    });

    it("supports regex when `regex: true`", async () => {
      const t = await setupAppDir({ "x.ts": "a1 b2 c3\n" }); cleanup = t.cleanup;
      const result = await applyMigration(
        migration([{ type: "replaceText", path: "x.ts", find: "[a-c]\\d", replace: "X", regex: true }]),
        { appDir: t.appDir, migrationDir: t.migrationDir }
      );
      expect(result.applied).toHaveLength(1);
      expect(await fs.readFile(path.join(t.appDir, "x.ts"), "utf8")).toBe("X X X\n");
    });
  });

  it("processes ops sequentially and tracks status independently", async () => {
    const t = await setupAppDir({ "keep.ts": "k", "rename-me.ts": "r" });
    cleanup = t.cleanup;
    await fs.writeFile(path.join(t.migrationDir, "files", "added.ts"), "a", "utf8");

    const result = await applyMigration(
      migration([
        { type: "addFile", path: "added.ts", source: "added.ts" },
        { type: "renameFile", from: "rename-me.ts", to: "renamed.ts" },
        { type: "deleteFile", path: "absent.ts" }, // skipped
        { type: "replaceText", path: "missing-target.ts", find: "x", replace: "y" }, // skipped (file missing)
      ]),
      { appDir: t.appDir, migrationDir: t.migrationDir }
    );

    expect(result.applied.map((o) => o.type)).toEqual(["addFile", "renameFile"]);
    expect(result.skipped.map((o) => o.type)).toEqual(["deleteFile", "replaceText"]);
    expect(result.conflicts).toHaveLength(0);
  });
});
