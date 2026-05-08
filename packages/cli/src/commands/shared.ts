import path from "node:path";
import process from "node:process";
import prompts from "prompts";
import pc from "picocolors";
import { repoRoot } from "../utils.js";
import type { ParsedFlags } from "../flags.js";

/** Lifecycle commands always operate on the cwd as the project root. */
export function projectDir(): string {
  return process.cwd();
}

/** Resolve the templates root for a lifecycle command. CLI flag wins; falls
 *  back to the bundled templates that ship with this CLI version. */
export function resolveTemplatesRoot(flags: ParsedFlags): string {
  if (flags.templatesDir) return path.resolve(flags.templatesDir);
  return path.join(repoRoot(), "templates");
}

export function resolveInfraRoot(flags: ParsedFlags): string {
  // No flag override yet — single-purpose use means the CLI's bundled infra is fine.
  void flags;
  return path.join(repoRoot(), "infra");
}

/** Confirm a destructive action unless `--yes` was passed. */
export async function confirm(message: string, yes: boolean): Promise<boolean> {
  if (yes) return true;
  if (!process.stdin.isTTY) {
    throw new Error(`Refusing to proceed without --yes in a non-TTY shell.\n  ${message}`);
  }
  const r = await prompts({ type: "confirm", name: "ok", message, initial: false });
  return r.ok === true;
}

export const ROLES = ["backend", "website", "adminpanel", "mobileapp"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(s: string | undefined): s is Role {
  return s != null && (ROLES as readonly string[]).includes(s);
}

export function abort(message: string): never {
  console.error(pc.red("\nFailed: ") + message);
  process.exit(1);
}
