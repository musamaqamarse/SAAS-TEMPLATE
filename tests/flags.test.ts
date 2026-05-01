import { describe, expect, it } from "vitest";
import { canRunNonInteractive, parseArgs } from "../src/flags.js";
import { configFromFlags } from "../src/prompts.js";

describe("parseArgs", () => {
  it("returns scaffold command with no args", () => {
    expect(parseArgs([])).toEqual({ command: "scaffold", yes: false });
  });

  it("recognises --help and --version", () => {
    expect(parseArgs(["--help"]).command).toBe("help");
    expect(parseArgs(["-v"]).command).toBe("version");
  });

  it("recognises doctor", () => {
    expect(parseArgs(["doctor"]).command).toBe("doctor");
  });

  it("captures positional project name", () => {
    expect(parseArgs(["my-app"]).positional).toBe("my-app");
  });

  it("parses value flags", () => {
    const f = parseArgs([
      "my-app",
      "--data-stack", "firebase",
      "--backend", "nextjs-api",
      "--website", "reactjs",
      "--admin", "none",
      "--mobile", "flutter",
      "--bundle-vendor", "com.acme",
      "--description", "Cool thing",
      "--out", "./somewhere",
    ]);
    expect(f.dataStack).toBe("firebase");
    expect(f.backend).toBe("nextjs-api");
    expect(f.website).toBe("reactjs");
    expect(f.admin).toBe("none");
    expect(f.mobile).toBe("flutter");
    expect(f.bundleVendor).toBe("com.acme");
    expect(f.description).toBe("Cool thing");
    expect(f.out).toBe("./somewhere");
  });

  it("parses boolean flags", () => {
    const f = parseArgs(["x", "--yes", "--no-infra", "--no-git", "--create-github-repos", "--public"]);
    expect(f.yes).toBe(true);
    expect(f.includeInfra).toBe(false);
    expect(f.initGit).toBe(false);
    expect(f.createGithubRepos).toBe(true);
    expect(f.githubVisibility).toBe("public");
  });

  it("rejects an unknown flag", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(/Unknown flag/);
  });

  it("rejects a value flag with no value", () => {
    expect(() => parseArgs(["--data-stack"])).toThrow(/expects a value/);
  });
});

describe("canRunNonInteractive", () => {
  it("is true with --config", () => {
    expect(canRunNonInteractive(parseArgs(["--config", "x.json"]))).toBe(true);
  });
  it("is true with --yes + project name", () => {
    expect(canRunNonInteractive(parseArgs(["my-app", "--yes"]))).toBe(true);
  });
  it("is false with --yes alone", () => {
    expect(canRunNonInteractive(parseArgs(["--yes"]))).toBe(false);
  });
  it("is false with project name alone", () => {
    expect(canRunNonInteractive(parseArgs(["my-app"]))).toBe(false);
  });
});

describe("configFromFlags", () => {
  it("builds a valid ScaffoldConfig from minimal flags", () => {
    const cfg = configFromFlags(parseArgs(["my-cool-app", "--yes"]));
    expect(cfg.projectName).toBe("my-cool-app");
    expect(cfg.projectKebab).toBe("my-cool-app");
    expect(cfg.dataStack).toBe("supabase"); // default
    expect(cfg.backend).toBe("fastapi");
    expect(cfg.includeInfra).toBe(true);
    expect(cfg.initGit).toBe(true);
  });

  it("respects flag-supplied choices", () => {
    const cfg = configFromFlags(parseArgs([
      "Acme Inc", "--yes",
      "--data-stack", "firebase",
      "--backend", "none",
      "--website", "reactjs",
      "--admin", "none",
      "--mobile", "flutter",
      "--bundle-vendor", "com.acme",
      "--no-infra",
      "--no-git",
    ]));
    expect(cfg.dataStack).toBe("firebase");
    expect(cfg.backend).toBe("none");
    expect(cfg.website).toBe("reactjs");
    expect(cfg.adminPanel).toBe("none");
    expect(cfg.mobile).toBe("flutter");
    expect(cfg.bundleId).toBe("com.acme.acmeinc");
    expect(cfg.includeInfra).toBe(false);
    expect(cfg.initGit).toBe(false);
  });

  it("rejects when project name is missing", () => {
    expect(() => configFromFlags(parseArgs(["--yes"]))).toThrow(/Project name is required/);
  });

  it("rejects when project name is too short", () => {
    expect(() => configFromFlags(parseArgs(["x", "--yes"]))).toThrow();
  });
});
