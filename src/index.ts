#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pc from "picocolors";
import { configFromFlags, loadConfigFile, runPrompts } from "./prompts.js";
import { scaffold, type ScaffoldConfig, type ScaffoldEvent } from "./core/index.js";
import { runDoctor } from "./doctor.js";
import { capture, captureException, initTelemetry, shutdownTelemetry } from "./telemetry.js";
import { ghCreateRepo, gitInitAndCommit, hasGh, hasGit } from "./git.js";
import { repoRoot } from "./utils.js";
import { canRunNonInteractive, parseArgs, type ParsedFlags } from "./flags.js";

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot(), "package.json"), "utf8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

const HELP = `
${pc.bold(pc.cyan("create-saas"))} — scaffold a new SaaS project

${pc.bold("Usage")}
  create-saas [project-name]              Interactive scaffold (default)
  create-saas doctor                      Check your toolchain
  create-saas --version                   Print version
  create-saas --help                      Print this help

${pc.bold("Non-interactive mode")} (for CI / agents)
  create-saas --config <path>             Scaffold from a JSON ScaffoldConfig
  create-saas <name> --yes [flags]        Skip prompts, fill gaps with defaults

${pc.bold("Flags")}
  --name <text>              Project name (alternative to positional)
  --description <text>       One-line description
  --data-stack <id>          supabase | firebase                          (default: supabase)
  --backend <id>             fastapi | nextjs-api | none                  (default: fastapi)
  --website <id>             nextjs | reactjs | none                      (default: nextjs)
  --admin <id>               nextjs | none                                (default: nextjs)
  --mobile <id>              flutter | none                               (default: none)
  --bundle-vendor <com.x>    Mobile bundle ID prefix                      (default: com.example)
  --out <dir>                Output directory                             (default: ./<kebab>)
  --no-infra                 Don't include the infra/ folder
  --no-git                   Don't init git in each subfolder
  --create-github-repos      Create GitHub repos via gh CLI
  --public                   Public GitHub repos (default: private)
  --yes, -y                  Accept all defaults; required for non-interactive

${pc.bold("Telemetry")}
  Telemetry and crash reporting are OFF by default. Enable with:
    CREATE_SAAS_TELEMETRY=1            anonymous usage events (PostHog)
    CREATE_SAAS_SENTRY_DSN=<dsn>       crash reporting (Sentry)
`;

function printVersion() {
  console.log(readPackageVersion());
}

async function resolveConfig(flags: ParsedFlags): Promise<ScaffoldConfig | null> {
  if (flags.configPath) return await loadConfigFile(flags.configPath);
  if (canRunNonInteractive(flags)) return configFromFlags(flags);
  return await runPrompts(flags);
}

function makeEventHandler(): (e: ScaffoldEvent) => void {
  return (e) => {
    switch (e.kind) {
      case "app-start":
        console.log(pc.dim(`  • ${e.displayName}  →  ${e.folder}`));
        break;
      case "app-skipped-flutter":
        console.warn(pc.yellow(`    ! ${e.reason} — skipping flutter create (run it manually in ${e.folder})`));
        break;
      case "infra":
        console.log(pc.dim(`  • Infra  →  ${e.folder}`));
        break;
      case "saas-config":
        console.log(pc.dim(`  • Wrote ${e.file}`));
        break;
      case "agent-rules":
        console.log(pc.dim(`  • Wrote ${e.files.join(", ")}`));
        break;
      case "warning":
        console.warn(pc.yellow(`  ! ${e.message}`));
        break;
    }
  };
}

async function postScaffold(cfg: ScaffoldConfig, createdDirs: string[]): Promise<void> {
  if (cfg.initGit) {
    if (!(await hasGit())) {
      console.warn(pc.yellow("  ! git not found on PATH — skipping git init"));
    } else {
      console.log(pc.dim("\n  Initializing git repos…"));
      for (const dir of createdDirs) {
        try {
          await gitInitAndCommit(dir, "chore: initial scaffold");
          console.log(pc.dim(`    ✓ ${path.basename(dir)}`));
        } catch (err) {
          console.warn(pc.yellow(`    ! git init failed for ${path.basename(dir)}: ${(err as Error).message.split("\n")[0]}`));
        }
      }
    }
  }

  if (cfg.createGithubRepos) {
    if (!(await hasGh())) {
      console.warn(pc.yellow("  ! gh CLI not found — skipping remote repo creation"));
    } else {
      console.log(pc.dim("\n  Creating GitHub repos…"));
      for (const dir of createdDirs) {
        const url = await ghCreateRepo(dir, path.basename(dir), cfg.githubVisibility, cfg.description);
        if (url) console.log(pc.dim(`    ✓ ${path.basename(dir)}  ${url}`));
      }
    }
  }
}

async function runScaffold(flags: ParsedFlags): Promise<number> {
  console.log("");
  console.log(pc.bold(pc.cyan("create-saas")) + pc.gray(" — scaffold a new SaaS project"));
  console.log("");

  const config = await resolveConfig(flags);
  if (!config) {
    console.log(pc.yellow("Aborted."));
    return 1;
  }

  console.log(pc.bold("Scaffolding ") + pc.cyan(config.projectName) + pc.gray(`  →  ${config.destDir}`));
  console.log(pc.gray(`  data stack: ${config.dataStack}`));

  capture("scaffold_started", {
    dataStack: config.dataStack,
    backend: config.backend,
    website: config.website,
    adminPanel: config.adminPanel,
    mobile: config.mobile,
    includeInfra: config.includeInfra,
    initGit: config.initGit,
    createGithubRepos: config.createGithubRepos,
    nonInteractive: !!flags.configPath || flags.yes,
  });

  try {
    const result = await scaffold(config, {
      templatesRoot: path.join(repoRoot(), "templates"),
      infraRoot: path.join(repoRoot(), "infra"),
      cliVersion: readPackageVersion(),
      onEvent: makeEventHandler(),
    });

    await postScaffold(config, result.createdDirs);

    console.log("");
    console.log(pc.green(pc.bold("Done.")) + " Next steps:");
    console.log(pc.gray(`  cd ${path.basename(config.destDir)}`));
    for (const dir of result.createdDirs) {
      console.log(pc.gray(`  • ${path.basename(dir)} — see its README for setup`));
    }
    console.log(pc.gray(`  • CLAUDE.md / agents.md / .cursorrules at project root — read by AI tools`));
    console.log("");

    capture("scaffold_completed", { dataStack: config.dataStack });
    return 0;
  } catch (err) {
    capture("scaffold_failed", {
      dataStack: config.dataStack,
      error_class: err instanceof Error ? err.name : "Unknown",
    });
    captureException(err);
    throw err;
  }
}

async function main() {
  await initTelemetry();

  let flags: ParsedFlags;
  try {
    flags = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(pc.red("\nFailed: ") + (err as Error).message);
    return 1;
  }

  try {
    if (flags.command === "help") { console.log(HELP); return 0; }
    if (flags.command === "version") { printVersion(); return 0; }
    if (flags.command === "doctor") {
      capture("doctor_invoked");
      return await runDoctor();
    }
    return await runScaffold(flags);
  } catch (err) {
    if (err instanceof Error) {
      console.error(pc.red("\nFailed: ") + err.message);
      if (process.env.DEBUG) console.error(err.stack);
    } else {
      console.error(pc.red("\nFailed:"), err);
    }
    captureException(err);
    return 1;
  } finally {
    await shutdownTelemetry();
  }
}

main().then((code) => process.exit(code));
