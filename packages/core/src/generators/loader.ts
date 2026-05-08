import fs from "node:fs/promises";
import path from "node:path";
import { pathExists } from "../fs.js";
import { GeneratorSchema, type Generator, type GeneratorUnit } from "./schema.js";

/**
 * Look up a generator manifest for a given template + unit.
 *
 * Returns null when the template doesn't ship that unit (the caller decides
 * whether to error or fall through to other candidate templates).
 *
 * Manifests live at `templates/<templateName>/generators/<unit>.json`.
 */
export async function loadGenerator(
  templatesRoot: string,
  templateName: string,
  unit: GeneratorUnit
): Promise<{ generator: Generator; generatorsDir: string } | null> {
  const generatorsDir = path.join(templatesRoot, templateName, "generators");
  const file = path.join(generatorsDir, `${unit}.json`);
  if (!(await pathExists(file))) return null;

  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (err) {
    throw new Error(`Failed to read generator manifest ${file}: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${file}: ${(err as Error).message}`);
  }

  const result = GeneratorSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid generator manifest in ${file}:\n${issues}`);
  }

  return { generator: result.data, generatorsDir };
}
