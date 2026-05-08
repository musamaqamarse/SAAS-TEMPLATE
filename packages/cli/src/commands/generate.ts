import path from "node:path";
import pc from "picocolors";
import { generateUnit, GENERATOR_UNITS, type GeneratorUnit } from "@create-saas/core";
import type { ParsedFlags } from "../flags.js";
import { capture } from "../telemetry.js";
import {
  abort,
  projectDir,
  resolveInfraRoot,
  resolveTemplatesRoot,
} from "./shared.js";

function isUnit(s: string | undefined): s is GeneratorUnit {
  return s != null && (GENERATOR_UNITS as readonly string[]).includes(s);
}

export async function runGenerate(flags: ParsedFlags): Promise<number> {
  const unit = flags.positional;
  const name = flags.positional2;

  if (!isUnit(unit)) {
    abort(
      `\`generate\` needs a unit. Try one of: ${GENERATOR_UNITS.join(", ")}\n` +
        `  Example: create-saas generate route users`
    );
  }
  if (!name) {
    abort(
      `\`generate ${unit}\` needs a name.\n` +
        `  Example: create-saas generate ${unit} ${unit === "model" ? "Order" : "users"}`
    );
  }

  capture("generate_invoked", { unit });

  try {
    const result = await generateUnit({
      projectDir: projectDir(),
      unit,
      name,
      target: flags.target,
      templatesRoot: resolveTemplatesRoot(flags),
      infraRoot: resolveInfraRoot(flags),
    });

    console.log(
      pc.green(`✓ Generated ${unit} "${name}"`) +
        pc.gray(`  in ${result.appFolder}/  (template: ${result.templateName})`)
    );
    for (const f of result.written) {
      console.log(pc.dim(`  • ${path.relative(projectDir(), f)}`));
    }
    console.log("");
    return 0;
  } catch (err) {
    abort((err as Error).message);
  }
}
