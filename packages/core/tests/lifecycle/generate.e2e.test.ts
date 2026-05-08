import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scaffold, generateUnit, type ScaffoldConfig } from "../../src/index.js";
import { workspaceRoot } from "../helpers/workspace-root.js";

const OPTIONS = {
  templatesRoot: path.join(workspaceRoot(), "templates"),
  infraRoot: path.join(workspaceRoot(), "infra"),
  cliVersion: "0.3.0-test",
};

function fastapiOnly(destDir: string): ScaffoldConfig {
  return {
    projectName: "Gen Test",
    projectKebab: "gen-test",
    projectSnake: "gen_test",
    projectPascal: "GenTest",
    bundleId: "com.example.gentest",
    description: "generate command test",
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

function fullStack(destDir: string): ScaffoldConfig {
  return {
    ...fastapiOnly(destDir),
    website: "nextjs",
    adminPanel: "nextjs",
  };
}

describe("generateUnit (e2e)", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "lifecycle-gen-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("generates a FastAPI route with name transforms applied", async () => {
    const dest = path.join(tmp, "gen-test");
    await scaffold(fastapiOnly(dest), OPTIONS);

    const result = await generateUnit({
      projectDir: dest,
      unit: "route",
      name: "OrderItems",
      templatesRoot: OPTIONS.templatesRoot,
      infraRoot: OPTIONS.infraRoot,
    });

    expect(result.appFolder).toBe("gen-test-backend");
    expect(result.templateName).toBe("backend-fastapi");
    expect(result.written).toHaveLength(1);

    // File written at the snake-cased path.
    const file = path.join(dest, "gen-test-backend", "app", "routers", "order_items.py");
    const content = await fs.readFile(file, "utf8");
    expect(content).toMatch(/prefix="\/order-items"/);
    expect(content).toMatch(/async def list_order_items/);
    // Project placeholders weren't relevant here; ensure no raw {name} leaks.
    expect(content).not.toMatch(/\{name/);
  });

  it("generates a FastAPI model with PascalCase class names", async () => {
    const dest = path.join(tmp, "gen-test");
    await scaffold(fastapiOnly(dest), OPTIONS);

    await generateUnit({
      projectDir: dest,
      unit: "model",
      name: "order_items",
      templatesRoot: OPTIONS.templatesRoot,
      infraRoot: OPTIONS.infraRoot,
    });

    const file = path.join(dest, "gen-test-backend", "app", "models", "order_items.py");
    const content = await fs.readFile(file, "utf8");
    expect(content).toMatch(/class OrderItems\(BaseModel\)/);
    expect(content).toMatch(/class OrderItemsCreate/);
    expect(content).toMatch(/class OrderItemsUpdate/);
  });

  it("requires --target when multiple apps could host the unit", async () => {
    const dest = path.join(tmp, "gen-test");
    await scaffold(fullStack(dest), OPTIONS);

    // Both website and adminpanel ship a `component` generator → ambiguous.
    await expect(
      generateUnit({
        projectDir: dest,
        unit: "component",
        name: "PriceTag",
        templatesRoot: OPTIONS.templatesRoot,
        infraRoot: OPTIONS.infraRoot,
      })
    ).rejects.toThrow(/Multiple apps/);
  });

  it("respects --target to disambiguate between candidate apps", async () => {
    const dest = path.join(tmp, "gen-test");
    await scaffold(fullStack(dest), OPTIONS);

    const result = await generateUnit({
      projectDir: dest,
      unit: "component",
      name: "PriceTag",
      target: "gen-test-adminpanel",
      templatesRoot: OPTIONS.templatesRoot,
      infraRoot: OPTIONS.infraRoot,
    });
    expect(result.appFolder).toBe("gen-test-adminpanel");

    const file = path.join(dest, "gen-test-adminpanel", "components", "PriceTag.tsx");
    const content = await fs.readFile(file, "utf8");
    expect(content).toMatch(/export function PriceTag/);
  });

  it("errors clearly when no app declares the requested unit", async () => {
    const dest = path.join(tmp, "gen-test");
    await scaffold(fastapiOnly(dest), OPTIONS); // backend only — no component generator

    await expect(
      generateUnit({
        projectDir: dest,
        unit: "component",
        name: "Whatever",
        templatesRoot: OPTIONS.templatesRoot,
        infraRoot: OPTIONS.infraRoot,
      })
    ).rejects.toThrow(/No app in this project/);
  });

  it("refuses to overwrite an existing file", async () => {
    const dest = path.join(tmp, "gen-test");
    await scaffold(fastapiOnly(dest), OPTIONS);

    await generateUnit({
      projectDir: dest,
      unit: "route",
      name: "invoices",
      templatesRoot: OPTIONS.templatesRoot,
      infraRoot: OPTIONS.infraRoot,
    });

    await expect(
      generateUnit({
        projectDir: dest,
        unit: "route",
        name: "invoices",
        templatesRoot: OPTIONS.templatesRoot,
        infraRoot: OPTIONS.infraRoot,
      })
    ).rejects.toThrow(/Refusing to overwrite/);
  });
});
