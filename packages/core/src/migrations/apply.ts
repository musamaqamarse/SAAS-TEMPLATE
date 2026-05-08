import fs from "node:fs/promises";
import path from "node:path";
import { pathExists } from "../fs.js";
import type { Migration, MigrationOp } from "./schema.js";

export type ConflictKind =
  | "addFile_existsDifferent"
  | "renameFile_targetExists"
  | "patchJson_invalid"
  | "replaceText_findNotFound";

export interface MigrationConflict {
  op: MigrationOp;
  kind: ConflictKind;
  /** Project-relative file the conflict centers on. */
  path: string;
  /** Human-readable explanation; rendered in the CLI summary. */
  message: string;
  /** Companion file written next to the original (if any) so the user can
   *  resolve manually — e.g. `<file>.update-conflict`. */
  companion?: string;
}

export interface ApplyMigrationResult {
  applied: MigrationOp[];
  skipped: MigrationOp[];
  conflicts: MigrationConflict[];
}

export interface ApplyMigrationOptions {
  /** Absolute path of the app folder the migration is applied to. */
  appDir: string;
  /** Where the migration JSON lives — used as the base for `addFile.source`,
   *  which is resolved relative to `<dir>/files/<source>`. */
  migrationDir: string;
}

/**
 * Apply one migration's ops to an app folder, in order. Conflicts are
 * collected, not thrown — the caller (`update`) accumulates them across all
 * migrations and surfaces a single summary at the end. Hard I/O failures
 * (missing migration source files, unreadable target files) DO throw,
 * because they indicate a broken migration that nobody could resolve.
 */
export async function applyMigration(
  migration: Migration,
  opts: ApplyMigrationOptions
): Promise<ApplyMigrationResult> {
  const result: ApplyMigrationResult = { applied: [], skipped: [], conflicts: [] };

  for (const op of migration.ops) {
    try {
      const status = await runOp(op, opts);
      if (status.kind === "applied") result.applied.push(op);
      else if (status.kind === "skipped") result.skipped.push(op);
      else result.conflicts.push({ op, ...status.conflict });
    } catch (err) {
      throw new Error(
        `Migration "${migration.id}" failed on op ${describeOp(op)}: ${(err as Error).message}`
      );
    }
  }
  return result;
}

type OpStatus =
  | { kind: "applied" }
  | { kind: "skipped" }
  | { kind: "conflict"; conflict: Omit<MigrationConflict, "op"> };

async function runOp(op: MigrationOp, opts: ApplyMigrationOptions): Promise<OpStatus> {
  switch (op.type) {
    case "addFile":     return await opAddFile(op, opts);
    case "deleteFile":  return await opDeleteFile(op, opts);
    case "renameFile":  return await opRenameFile(op, opts);
    case "patchJson":   return await opPatchJson(op, opts);
    case "replaceText": return await opReplaceText(op, opts);
  }
}

async function opAddFile(
  op: Extract<MigrationOp, { type: "addFile" }>,
  opts: ApplyMigrationOptions
): Promise<OpStatus> {
  const source = path.join(opts.migrationDir, "files", op.source);
  const target = path.join(opts.appDir, op.path);

  const sourceContent = await fs.readFile(source, "utf8").catch((err) => {
    throw new Error(`addFile source missing: ${source} (${(err as Error).message})`);
  });

  if (await pathExists(target)) {
    const existing = await fs.readFile(target, "utf8");
    if (existing === sourceContent) return { kind: "skipped" };
    return {
      kind: "conflict",
      conflict: {
        kind: "addFile_existsDifferent",
        path: op.path,
        message: `Wanted to add ${op.path} but it already exists with different content. Left in place.`,
      },
    };
  }

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, sourceContent, "utf8");
  return { kind: "applied" };
}

async function opDeleteFile(
  op: Extract<MigrationOp, { type: "deleteFile" }>,
  opts: ApplyMigrationOptions
): Promise<OpStatus> {
  const target = path.join(opts.appDir, op.path);
  if (!(await pathExists(target))) return { kind: "skipped" };
  await fs.rm(target, { force: true });
  return { kind: "applied" };
}

async function opRenameFile(
  op: Extract<MigrationOp, { type: "renameFile" }>,
  opts: ApplyMigrationOptions
): Promise<OpStatus> {
  const from = path.join(opts.appDir, op.from);
  const to = path.join(opts.appDir, op.to);

  if (!(await pathExists(from))) return { kind: "skipped" };
  if (await pathExists(to)) {
    return {
      kind: "conflict",
      conflict: {
        kind: "renameFile_targetExists",
        path: op.to,
        message: `Wanted to rename ${op.from} → ${op.to} but ${op.to} already exists. Left both in place.`,
      },
    };
  }

  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
  return { kind: "applied" };
}

async function opPatchJson(
  op: Extract<MigrationOp, { type: "patchJson" }>,
  opts: ApplyMigrationOptions
): Promise<OpStatus> {
  const target = path.join(opts.appDir, op.path);
  if (!(await pathExists(target))) return { kind: "skipped" };

  const raw = await fs.readFile(target, "utf8");
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    return {
      kind: "conflict",
      conflict: {
        kind: "patchJson_invalid",
        path: op.path,
        message: `Couldn't parse ${op.path} as JSON (${(err as Error).message}). Left untouched.`,
      },
    };
  }

  let next = parsed;
  if (op.set) next = { ...next, ...op.set };
  if (op.merge) next = deepMerge(next, op.merge);
  if (op.unset) {
    for (const k of op.unset) {
      const path = k.split(".");
      removePath(next, path);
    }
  }

  await fs.writeFile(target, JSON.stringify(next, null, 2) + "\n", "utf8");
  return { kind: "applied" };
}

async function opReplaceText(
  op: Extract<MigrationOp, { type: "replaceText" }>,
  opts: ApplyMigrationOptions
): Promise<OpStatus> {
  const target = path.join(opts.appDir, op.path);
  if (!(await pathExists(target))) return { kind: "skipped" };

  const content = await fs.readFile(target, "utf8");

  let next: string;
  let matched: boolean;
  if (op.regex) {
    const re = new RegExp(op.find, "g");
    matched = re.test(content);
    next = content.replace(new RegExp(op.find, "g"), op.replace);
  } else {
    matched = content.includes(op.find);
    next = matched ? content.split(op.find).join(op.replace) : content;
  }

  if (!matched) {
    const companion = target + ".update-conflict";
    const note = [
      `# Unapplied template patch for ${op.path}`,
      `#`,
      `# The migration tried to find this snippet:`,
      `# ---`,
      ...op.find.split("\n").map((l) => `# ${l}`),
      `# ---`,
      `# but it wasn't present (you may have edited that section).`,
      `# Wanted to replace it with:`,
      `# ---`,
      ...op.replace.split("\n").map((l) => `# ${l}`),
      `# ---`,
      `# Resolve by hand, then delete this file.`,
      ``,
    ].join("\n");
    await fs.writeFile(companion, note, "utf8");
    return {
      kind: "conflict",
      conflict: {
        kind: "replaceText_findNotFound",
        path: op.path,
        message: `Couldn't find the target snippet in ${op.path}. Wrote ${path.basename(companion)} for review.`,
        companion,
      },
    };
  }

  await fs.writeFile(target, next, "utf8");
  return { kind: "applied" };
}

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  patch: Record<string, unknown>
): T {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const existing = out[k];
    if (isPlainObject(existing) && isPlainObject(v)) {
      out[k] = deepMerge(existing, v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

function removePath(obj: Record<string, unknown>, parts: string[]): void {
  if (parts.length === 0) return;
  if (parts.length === 1) {
    delete obj[parts[0]];
    return;
  }
  const child = obj[parts[0]];
  if (isPlainObject(child)) removePath(child, parts.slice(1));
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function describeOp(op: MigrationOp): string {
  switch (op.type) {
    case "addFile":     return `addFile ${op.path}`;
    case "deleteFile":  return `deleteFile ${op.path}`;
    case "renameFile":  return `renameFile ${op.from} → ${op.to}`;
    case "patchJson":   return `patchJson ${op.path}`;
    case "replaceText": return `replaceText ${op.path}`;
  }
}
