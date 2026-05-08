import path from "node:path";
import pc from "picocolors";
import { updateProject } from "@create-saas/core";
import type { ParsedFlags } from "../flags.js";
import { capture } from "../telemetry.js";
import {
  abort,
  projectDir,
  resolveInfraRoot,
  resolveTemplatesRoot,
} from "./shared.js";

export async function runUpdate(flags: ParsedFlags): Promise<number> {
  const root = projectDir();

  capture("update_started", { dryRun: !!flags.dryRun });

  try {
    const result = await updateProject({
      projectDir: root,
      dryRun: !!flags.dryRun,
      templatesRoot: resolveTemplatesRoot(flags),
      infraRoot: resolveInfraRoot(flags),
    });

    if (!result.changed) {
      console.log(pc.green("✓ Already up to date.") + pc.gray("  Nothing to migrate."));
      capture("update_completed", { changed: false, conflicts: 0 });
      return 0;
    }

    if (result.dryRun) {
      console.log(pc.bold("Update plan (dry run):"));
      for (const plan of result.plans) {
        console.log(
          pc.cyan(`  • ${plan.template}`) +
            pc.gray(`  ${plan.fromVersion} → ${plan.toVersion}  (${plan.migrations.length} migration(s))`)
        );
        for (const m of plan.migrations) {
          console.log(pc.dim(`      ${m.id}: ${m.description}  [${m.ops.length} op(s)]`));
        }
      }
      console.log(pc.gray("\nRe-run without --dry-run to apply."));
      capture("update_completed", { dryRun: true, changed: true, conflicts: 0 });
      return 0;
    }

    let totalConflicts = 0;
    for (const o of result.outcomes) {
      const conflictNote =
        o.conflicts.length === 0 ? pc.green("0 conflicts") : pc.yellow(`${o.conflicts.length} conflict(s)`);
      console.log(
        pc.green("✓ ") +
          pc.cyan(o.template) +
          pc.gray(`  ${o.fromVersion} → ${o.toVersion}  (${o.appliedMigrationIds.length} migration(s), `) +
          conflictNote +
          pc.gray(")")
      );
      for (const c of o.conflicts) {
        const where = path.join(o.folder, c.path);
        console.log(pc.yellow(`    ! ${c.kind}: ${where}`));
        console.log(pc.dim(`        ${c.message}`));
      }
      totalConflicts += o.conflicts.length;
    }

    if (result.agentRulesDrifted) {
      console.log(
        pc.yellow(
          "\n  ! CLAUDE.md / agents.md / .cursorrules look hand-edited — wrote .new copies for review."
        )
      );
    } else {
      console.log(pc.dim("  • Agent rules refreshed"));
    }

    if (totalConflicts > 0) {
      console.log(pc.yellow(`\n${totalConflicts} conflict(s) need manual resolution. Search for *.update-conflict files.`));
    }

    capture("update_completed", { changed: true, conflicts: totalConflicts });

    // Conflicts are exit 0 by default (review-style). --strict opts in to
    // CI semantics where any unresolved conflict fails the run.
    if (flags.strict && totalConflicts > 0) return 1;
    return 0;
  } catch (err) {
    capture("update_failed", { error_class: err instanceof Error ? err.name : "Unknown" });
    abort((err as Error).message);
  }
}
