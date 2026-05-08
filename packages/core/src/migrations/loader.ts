import fs from "node:fs/promises";
import path from "node:path";
import { pathExists } from "../fs.js";
import { MigrationSchema, type Migration } from "./schema.js";

/**
 * Read every migration manifest under `templates/<templateName>/migrations/`
 * and return them validated. Order is unspecified — call
 * `buildMigrationChain` to walk a specific version range.
 */
export async function loadMigrations(
  templatesRoot: string,
  templateName: string
): Promise<Array<{ migration: Migration; dir: string }>> {
  const migrationsDir = path.join(templatesRoot, templateName, "migrations");
  if (!(await pathExists(migrationsDir))) return [];

  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const out: Array<{ migration: Migration; dir: string }> = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const file = path.join(migrationsDir, entry.name);
    const raw = await fs.readFile(file, "utf8");

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(`Invalid JSON in migration ${file}: ${(err as Error).message}`);
    }

    const result = MigrationSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  • ${i.path.join(".") || "<root>"}: ${i.message}`)
        .join("\n");
      throw new Error(`Invalid migration manifest in ${file}:\n${issues}`);
    }

    out.push({ migration: result.data, dir: migrationsDir });
  }
  return out;
}

/**
 * Walk migrations linearly from `fromVersion` to `toVersion`.
 *
 * Constraint: at most one migration with each `from` value. We don't try to
 * resolve multi-edge graphs — branching version chains aren't a useful shape
 * for templates and this keeps the logic boring.
 *
 * Returns the ordered list. Throws if the chain is broken (e.g., missing
 * 1.1.0 → 1.2.0 step) or a cycle is detected.
 */
export function buildMigrationChain(
  migrations: Migration[],
  fromVersion: string,
  toVersion: string
): Migration[] {
  if (fromVersion === toVersion) return [];

  // Index by `from` for O(1) lookup. Reject duplicates loudly.
  const byFrom = new Map<string, Migration>();
  for (const m of migrations) {
    if (byFrom.has(m.from)) {
      throw new Error(
        `Two migrations declare from="${m.from}" (one of them is "${m.id}"). ` +
          `Each starting version must have exactly one migration.`
      );
    }
    byFrom.set(m.from, m);
  }

  const chain: Migration[] = [];
  let cursor = fromVersion;
  const visited = new Set<string>();

  while (cursor !== toVersion) {
    if (visited.has(cursor)) {
      throw new Error(
        `Migration cycle detected: "${cursor}" already visited. Inspect ` +
          `templates/<name>/migrations/ for a self-referential chain.`
      );
    }
    visited.add(cursor);

    const next = byFrom.get(cursor);
    if (!next) {
      throw new Error(
        `No migration found from version ${cursor}. ` +
          `Need a migration with from="${cursor}" to walk toward ${toVersion}.`
      );
    }
    chain.push(next);
    cursor = next.to;
  }
  return chain;
}
