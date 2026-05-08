import path from "node:path";
import pc from "picocolors";
import { removeApp } from "@create-saas/core";
import type { ParsedFlags } from "../flags.js";
import { capture } from "../telemetry.js";
import {
  ROLES,
  abort,
  confirm,
  isRole,
  projectDir,
  resolveInfraRoot,
  resolveTemplatesRoot,
} from "./shared.js";

export async function runRemove(flags: ParsedFlags): Promise<number> {
  const role = flags.positional;
  if (!isRole(role)) {
    abort(
      `\`remove\` needs a role. Try one of: ${ROLES.join(", ")}\n` +
        `  Example: create-saas remove adminpanel`
    );
  }

  const root = projectDir();
  const ok = await confirm(`Delete the ${role} folder and update saas.config.json?`, flags.yes);
  if (!ok) {
    console.log(pc.yellow("Aborted."));
    return 1;
  }

  capture("remove_invoked", { role });

  try {
    const result = await removeApp({
      projectDir: root,
      role,
      templatesRoot: resolveTemplatesRoot(flags),
      infraRoot: resolveInfraRoot(flags),
    });

    console.log(
      pc.green("✓ Removed ") +
        pc.cyan(path.basename(result.removedFolder)) +
        pc.gray(`  (template: ${result.removedTemplate})`)
    );

    if (result.agentRulesDrifted) {
      console.log(
        pc.yellow(
          "\n  ! CLAUDE.md / agents.md / .cursorrules look hand-edited — wrote .new copies for review."
        )
      );
    } else {
      console.log(pc.dim("  • Agent rules refreshed"));
    }

    if (result.manualFollowUps.length > 0) {
      console.log("\n" + pc.bold("Manual follow-ups:"));
      for (const m of result.manualFollowUps) console.log(pc.gray("  • " + m));
    }
    console.log("");
    return 0;
  } catch (err) {
    abort((err as Error).message);
  }
}
