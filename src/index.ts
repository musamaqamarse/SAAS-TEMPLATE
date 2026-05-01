#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pc from "picocolors";
import { runPrompts } from "./prompts.js";
import { scaffold } from "./scaffold.js";
import { runDoctor } from "./doctor.js";
import { capture, captureException, initTelemetry, shutdownTelemetry } from "./telemetry.js";
import { repoRoot } from "./utils.js";

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
  create-saas [project-name]        Interactive scaffold (default)
  create-saas doctor                Check your toolchain
  create-saas --version             Print version
  create-saas --help                Print this help

${pc.bold("Telemetry")}
  Telemetry and crash reporting are OFF by default. Enable with:
    CREATE_SAAS_TELEMETRY=1            anonymous usage events (PostHog)
    CREATE_SAAS_SENTRY_DSN=<dsn>       crash reporting (Sentry)
`;

function printVersion() {
  console.log(readPackageVersion());
}

async function runScaffold(projectArg: string | undefined): Promise<number> {
  console.log("");
  console.log(pc.bold(pc.cyan("create-saas")) + pc.gray(" — scaffold a new SaaS project"));
  console.log("");

  const config = await runPrompts(projectArg);
  if (!config) {
    console.log(pc.yellow("Aborted."));
    return 1;
  }

  capture("scaffold_started", {
    dataStack: config.dataStack,
    backend: config.backend,
    website: config.website,
    adminPanel: config.adminPanel,
    mobile: config.mobile,
    includeInfra: config.includeInfra,
    initGit: config.initGit,
    createGithubRepos: config.createGithubRepos,
  });

  try {
    await scaffold(config);
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

  const args = process.argv.slice(2);
  const first = args[0];

  try {
    if (first === "--help" || first === "-h") {
      console.log(HELP);
      return 0;
    }
    if (first === "--version" || first === "-v") {
      printVersion();
      return 0;
    }
    if (first === "doctor") {
      capture("doctor_invoked");
      return await runDoctor();
    }
    return await runScaffold(first);
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
