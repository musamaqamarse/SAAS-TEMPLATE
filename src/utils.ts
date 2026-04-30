import path from "node:path";
import { fileURLToPath } from "node:url";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

/** Repo root (one level up from src/ when running tsx, or from dist/ when running compiled). */
export function repoRoot(): string {
  return path.resolve(__dirname, "..");
}

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
