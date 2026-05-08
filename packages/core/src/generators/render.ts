import fs from "node:fs/promises";
import path from "node:path";
import { toKebab, toPascal, toSnake } from "../identifiers.js";
import { applyReplacements, buildReplacements, type PlaceholderInput } from "../placeholders.js";
import { pathExists } from "../fs.js";
import type { Generator } from "./schema.js";

export interface RenderGeneratorOptions {
  generator: Generator;
  /** Where the generator's `.tmpl` source files live. */
  generatorsDir: string;
  /** App folder the generated files land inside. */
  appDir: string;
  /** User-supplied arg (e.g. "users", "OrderItem"). */
  name: string;
  /** Project identity for project-level placeholder substitution. */
  projectInput: PlaceholderInput;
}

export interface RenderGeneratorResult {
  written: string[];
}

/**
 * Run a generator: for each declared file, read its template, substitute
 * `{name}`/`{name_kebab}`/`{name_snake}`/`{name_pascal}` plus the standard
 * project placeholders (`__PROJECT_NAME__`, etc.), and write to the
 * destination path.
 *
 * Refuses to overwrite existing files — generators only create. If a target
 * already exists, the user picked a name collision and should fix it
 * themselves rather than have us silently clobber their code.
 */
export async function renderGenerator(opts: RenderGeneratorOptions): Promise<RenderGeneratorResult> {
  const tokens = nameTokens(opts.name);
  const projectReplacements = buildReplacements(opts.projectInput);

  const written: string[] = [];
  for (const file of opts.generator.files) {
    const source = path.join(opts.generatorsDir, file.from);
    const targetRel = substituteNameTokens(file.to, tokens);
    const target = path.join(opts.appDir, targetRel);

    if (await pathExists(target)) {
      throw new Error(
        `Refusing to overwrite ${path.relative(opts.appDir, target)} in ${path.basename(opts.appDir)}/. ` +
          `Pick a different name or remove the existing file.`
      );
    }

    let content: string;
    try {
      content = await fs.readFile(source, "utf8");
    } catch (err) {
      throw new Error(
        `Generator template missing: ${source} (declared in manifest). ` +
          `Original error: ${(err as Error).message}`
      );
    }

    content = substituteNameTokens(content, tokens);
    content = applyReplacements(content, projectReplacements);

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf8");
    written.push(target);
  }
  return { written };
}

interface NameTokens {
  raw: string;
  kebab: string;
  snake: string;
  pascal: string;
}

function nameTokens(input: string): NameTokens {
  return {
    raw: input,
    kebab: toKebab(input),
    snake: toSnake(input),
    pascal: toPascal(input),
  };
}

function substituteNameTokens(input: string, t: NameTokens): string {
  // Order matters: longer tokens first so `{name_kebab}` isn't partially
  // matched by `{name}`.
  return input
    .replace(/\{name_kebab\}/g, t.kebab)
    .replace(/\{name_snake\}/g, t.snake)
    .replace(/\{name_pascal\}/g, t.pascal)
    .replace(/\{name\}/g, t.raw);
}
