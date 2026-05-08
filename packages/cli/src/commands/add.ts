import path from "node:path";
import pc from "picocolors";
import { addApp, VARIANTS_BY_ROLE, type ScaffoldEvent } from "@create-saas/core";
import type { ParsedFlags } from "../flags.js";
import { capture } from "../telemetry.js";
import {
  ROLES,
  abort,
  isRole,
  projectDir,
  resolveInfraRoot,
  resolveTemplatesRoot,
} from "./shared.js";

function makeEventHandler(): (e: ScaffoldEvent) => void {
  return (e) => {
    if (e.kind === "app-start") {
      console.log(pc.dim(`  • ${e.displayName}  →  ${e.folder}`));
    } else if (e.kind === "app-skipped-flutter") {
      console.warn(pc.yellow(`    ! ${e.reason} — skipping flutter create (run it manually in ${e.folder})`));
    } else if (e.kind === "warning") {
      console.warn(pc.yellow(`  ! ${e.message}`));
    }
  };
}

export async function runAdd(flags: ParsedFlags): Promise<number> {
  const role = flags.positional;
  if (!isRole(role)) {
    abort(
      `\`add\` needs a role. Try one of: ${ROLES.join(", ")}\n` +
        `  Example: create-saas add adminpanel`
    );
  }

  // For roles with multiple variants, --variant is required up-front so we
  // can error before doing any work.
  if (!flags.variant && VARIANTS_BY_ROLE[role].length > 1) {
    abort(
      `${role} has multiple variants — pass --variant <${VARIANTS_BY_ROLE[role].join("|")}>\n` +
        `  Example: create-saas add ${role} --variant ${VARIANTS_BY_ROLE[role][0]}`
    );
  }

  capture("add_invoked", { role, variant: flags.variant ?? VARIANTS_BY_ROLE[role][0] });

  try {
    const result = await addApp({
      projectDir: projectDir(),
      role,
      variant: flags.variant,
      templatesRoot: resolveTemplatesRoot(flags),
      infraRoot: resolveInfraRoot(flags),
      onEvent: makeEventHandler(),
    });

    console.log(
      pc.green("✓ Added ") +
        pc.cyan(path.basename(result.destFolder)) +
        pc.gray(`  (template: ${result.templateName})`)
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

    console.log(pc.gray(`\n  Next: cd ${path.basename(result.destFolder)} && read its README for setup.`));
    console.log("");
    return 0;
  } catch (err) {
    abort((err as Error).message);
  }
}
