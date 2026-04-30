#!/usr/bin/env node
import process from "node:process";
import pc from "picocolors";
import { runPrompts } from "./prompts.js";
import { scaffold } from "./scaffold.js";

async function main() {
  const projectArg = process.argv[2];

  console.log("");
  console.log(pc.bold(pc.cyan("create-saas")) + pc.gray(" — scaffold a new SaaS project"));
  console.log("");

  try {
    const config = await runPrompts(projectArg);
    if (!config) {
      console.log(pc.yellow("Aborted."));
      process.exit(1);
    }
    await scaffold(config);
  } catch (err) {
    if (err instanceof Error) {
      console.error(pc.red("\nFailed: ") + err.message);
      if (process.env.DEBUG) console.error(err.stack);
    } else {
      console.error(pc.red("\nFailed:"), err);
    }
    process.exit(1);
  }
}

main();
