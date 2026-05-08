import { z } from "zod";

/**
 * A generator is a small recipe declared in `templates/<name>/generators/<unit>.json`
 * for emitting one structural unit (a route, a model, a component, a page)
 * inside an existing scaffolded app folder.
 *
 * Each generator declares its files (source `.tmpl` → destination path) and
 * a small set of name transforms applied to the user-supplied argument.
 *
 * Phase 3 ships file generation only. A future `patches` field can extend
 * existing files (insert after a marker, etc.) — kept off the v1 surface so
 * the schema doesn't grow before there's a real need.
 */
export const GeneratorFileSchema = z.object({
  /** Path of the template file, relative to the template's `generators/` folder. */
  from: z.string().min(1),
  /** Destination, relative to the app folder. May contain `{name}`,
   *  `{name_kebab}`, `{name_snake}`, `{name_pascal}` substitutions. */
  to: z.string().min(1),
});
export type GeneratorFile = z.infer<typeof GeneratorFileSchema>;

export const GeneratorSchema = z.object({
  /** Unit name. Phase 3: route | model | component | page. */
  unit: z.enum(["route", "model", "component", "page"]),
  /** Short human-readable description of what this generator produces. */
  description: z.string().min(1),
  files: z.array(GeneratorFileSchema).min(1),
});
export type Generator = z.infer<typeof GeneratorSchema>;

export type GeneratorUnit = Generator["unit"];

export const GENERATOR_UNITS: readonly GeneratorUnit[] = [
  "route",
  "model",
  "component",
  "page",
] as const;
