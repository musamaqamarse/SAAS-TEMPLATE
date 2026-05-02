import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TemplateMetaSchema, loadTemplateMeta } from "../src/index.js";
import { workspaceRoot } from "./helpers/workspace-root.js";

const TEMPLATES_ROOT = path.join(workspaceRoot(), "templates");

async function listTemplates(): Promise<string[]> {
  const entries = await fs.readdir(TEMPLATES_ROOT, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

describe("TemplateMetaSchema", () => {
  it("accepts a minimal valid template", () => {
    expect(() =>
      TemplateMetaSchema.parse({
        name: "x",
        role: "backend",
        displayName: "X",
        language: "typescript",
        supports: ["supabase"],
        folderSuffix: "backend",
      })
    ).not.toThrow();
  });

  it("rejects unknown role", () => {
    const result = TemplateMetaSchema.safeParse({
      name: "x",
      role: "weird",
      displayName: "X",
      language: "typescript",
      supports: ["supabase"],
      folderSuffix: "x",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty supports[]", () => {
    const result = TemplateMetaSchema.safeParse({
      name: "x",
      role: "backend",
      displayName: "X",
      language: "typescript",
      supports: [],
      folderSuffix: "x",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = TemplateMetaSchema.safeParse({ name: "x" });
    expect(result.success).toBe(false);
  });

  it("accepts an optional version when SemVer-shaped", () => {
    const result = TemplateMetaSchema.safeParse({
      name: "x",
      role: "backend",
      displayName: "X",
      language: "typescript",
      supports: ["supabase"],
      folderSuffix: "x",
      version: "1.2.3",
    });
    expect(result.success).toBe(true);
  });

  it("rejects malformed version", () => {
    const result = TemplateMetaSchema.safeParse({
      name: "x",
      role: "backend",
      displayName: "X",
      language: "typescript",
      supports: ["supabase"],
      folderSuffix: "x",
      version: "1.2",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an optional prerendered flag", () => {
    const result = TemplateMetaSchema.safeParse({
      name: "x",
      role: "mobileapp",
      displayName: "X",
      language: "dart",
      supports: ["supabase"],
      folderSuffix: "mobileapp",
      prerendered: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("every shipped template", () => {
  it("has a valid _template.json", async () => {
    const names = await listTemplates();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const dir = path.join(TEMPLATES_ROOT, name);
      const meta = await loadTemplateMeta(dir);
      expect(meta.name).toBeTruthy();
      expect(meta.supports.length).toBeGreaterThan(0);
    }
  });
});
