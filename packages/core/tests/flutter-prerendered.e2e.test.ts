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

function makeFlutterConfig(destDir: string): ScaffoldConfig {
  return {
    projectName: "Flutter Smoke",
    projectKebab: "flutter-smoke",
    projectSnake: "flutter_smoke",
    projectPascal: "FlutterSmoke",
    bundleId: "com.acme.fluttersmoke",
    description: "flutter prerendered smoke",
    destDir,
    dataStack: "supabase",
    backend: "none",
    website: "none",
    adminPanel: "none",
    mobile: "flutter",
    includeInfra: false,
    initGit: false,
    createGithubRepos: false,
    githubVisibility: "private",
  };
}

describe("flutter prerendered shell (e2e)", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "scaffold-flutter-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("scaffolds Flutter without the SDK and substitutes bundle id + project snake", async () => {
    const dest = path.join(tmp, "flutter-smoke");
    await scaffold(makeFlutterConfig(dest), OPTIONS);

    const appRoot = path.join(dest, "flutter-smoke-mobileapp");
    expect(await fs.stat(appRoot)).toBeTruthy();

    // The Kotlin package directory must reflect the bundle id, not the placeholder.
    const kotlinDir = path.join(
      appRoot, "android", "app", "src", "main", "kotlin", "com", "acme", "fluttersmoke"
    );
    const mainActivity = path.join(kotlinDir, "MainActivity.kt");
    const mainActivityContent = await fs.readFile(mainActivity, "utf8");
    expect(mainActivityContent).toContain("package com.acme.fluttersmoke");
    expect(mainActivityContent).not.toContain("placeholder");

    // The placeholder Kotlin parent directories must be gone.
    await expect(
      fs.access(path.join(appRoot, "android", "app", "src", "main", "kotlin", "com", "placeholder"))
    ).rejects.toThrow();

    // AndroidManifest must reference the substituted snake name.
    const manifest = await fs.readFile(
      path.join(appRoot, "android", "app", "src", "main", "AndroidManifest.xml"),
      "utf8"
    );
    expect(manifest).toContain("flutter_smoke");
    expect(manifest).not.toContain("placeholder_app");

    // iOS Info.plist substitutes the snake name as bundle display name.
    const infoPlist = await fs.readFile(
      path.join(appRoot, "ios", "Runner", "Info.plist"),
      "utf8"
    );
    expect(infoPlist).not.toContain("placeholder_app");
  });
});
