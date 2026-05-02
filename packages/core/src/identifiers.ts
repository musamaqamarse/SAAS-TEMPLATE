/**
 * Project-name normalisers used by every consumer that builds a
 * `ScaffoldConfig` from raw user input. Pure functions; no I/O.
 *
 * The same input ("My Cool App") must produce the same kebab / snake / pascal
 * / bundle id everywhere — CLI prompts, web configurator, future SDKs — so
 * they live alongside the schema in core.
 */

export function toKebab(input: string): string {
  return input
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function toSnake(input: string): string {
  return toKebab(input).replace(/-/g, "_");
}

export function toPascal(input: string): string {
  return toKebab(input)
    .split("-")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

export function toBundleId(kebab: string, vendor = "com.example"): string {
  // bundle ids must be lowercase, no dashes
  const sanitized = kebab.replace(/-/g, "");
  return `${vendor}.${sanitized}`;
}
