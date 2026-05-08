import path from "node:path";
import { loadGenerator } from "../generators/loader.js";
import { renderGenerator } from "../generators/render.js";
import type { Generator, GeneratorUnit } from "../generators/schema.js";
import type { SaasProjectConfig } from "../schemas.js";
import { loadProject, type LoadProjectOptions } from "./project.js";

export interface GenerateOptions extends LoadProjectOptions {
  projectDir: string;
  unit: GeneratorUnit;
  /** User-supplied name (e.g. "users", "Order"). */
  name: string;
  /** Optional explicit target folder name (e.g. "my-app-website"). Required
   *  when multiple apps could host the unit; otherwise inferred. */
  target?: string;
}

export interface GenerateResult {
  /** The app folder where the unit was generated. */
  appFolder: string;
  /** The template that owns the generator. */
  templateName: string;
  /** Files written, absolute paths. */
  written: string[];
}

/**
 * Generate a structural unit (route/model/component/page) inside an app folder.
 *
 * Resolution order:
 *   1. If `target` is supplied, look up that template entry directly.
 *   2. Otherwise, find every template entry whose generator manifest exposes
 *      this unit. If exactly one matches → use it. If two or more → require
 *      the caller to disambiguate via `target`. If none → error.
 *
 * The generator itself is template-owned: the template's `generators/` folder
 * is the source of truth for what files get emitted and where.
 */
export async function generateUnit(opts: GenerateOptions): Promise<GenerateResult> {
  if (!opts.name || opts.name.trim() === "") {
    throw new Error(`generate ${opts.unit} needs a name.`);
  }

  const ctx = await loadProject(opts.projectDir, {
    templatesRoot: opts.templatesRoot,
    infraRoot: opts.infraRoot,
  });

  const candidate = await pickCandidate(ctx.config, ctx.templatesRoot, opts);
  const appDir = path.join(ctx.root, candidate.entry.folder);

  const projectInput = {
    projectName: ctx.config.project.name,
    projectKebab: ctx.config.project.kebab,
    projectSnake: ctx.config.project.snake,
    projectPascal: ctx.config.project.pascal,
    bundleId: ctx.config.project.bundleId,
    description: ctx.config.project.description,
  };

  const result = await renderGenerator({
    generator: candidate.generator,
    generatorsDir: candidate.generatorsDir,
    appDir,
    name: opts.name,
    projectInput,
  });

  return {
    appFolder: candidate.entry.folder,
    templateName: candidate.entry.name,
    written: result.written,
  };
}

interface Candidate {
  entry: SaasProjectConfig["templates"][number];
  generator: Generator;
  generatorsDir: string;
}

async function pickCandidate(
  config: SaasProjectConfig,
  templatesRoot: string,
  opts: GenerateOptions
): Promise<Candidate> {
  if (opts.target) {
    const entry = config.templates.find((t) => t.folder === opts.target);
    if (!entry) {
      throw new Error(
        `Target folder "${opts.target}" isn't a known app in this project. ` +
          `Try one of: ${config.templates.map((t) => t.folder).join(", ")}.`
      );
    }
    const loaded = await loadGenerator(templatesRoot, entry.name, opts.unit);
    if (!loaded) {
      throw new Error(
        `Template ${entry.name} (folder ${entry.folder}) does not declare a "${opts.unit}" generator.`
      );
    }
    return { entry, generator: loaded.generator, generatorsDir: loaded.generatorsDir };
  }

  // No target → scan all template entries for one that declares this unit.
  const matches: Candidate[] = [];
  for (const entry of config.templates) {
    const loaded = await loadGenerator(templatesRoot, entry.name, opts.unit);
    if (loaded) {
      matches.push({ entry, generator: loaded.generator, generatorsDir: loaded.generatorsDir });
    }
  }

  if (matches.length === 0) {
    throw new Error(
      `No app in this project has a "${opts.unit}" generator. ` +
        `Add a template that supports it, or check templates/<name>/generators/${opts.unit}.json exists.`
    );
  }
  if (matches.length > 1) {
    const folders = matches.map((m) => m.entry.folder).join(", ");
    throw new Error(
      `Multiple apps could host "${opts.unit}" (${folders}). ` +
        `Pass --target <folder> to pick one.`
    );
  }
  return matches[0];
}
