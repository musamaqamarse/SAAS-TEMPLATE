import { z } from "zod";

/**
 * Declarative template-version migration. Each template ships zero or more
 * migrations under `templates/<name>/migrations/<id>.json`; the `update`
 * command walks the chain from the recorded version (in saas.config.json)
 * to the current `_template.json` version and applies each in order.
 *
 * The op surface is kept small on purpose. Anything that can't be expressed
 * here today should NOT escape into a `runScript`-style escape hatch — that
 * would become the only way anyone writes migrations and the schema would
 * stop being declarative. Add ops only when a real migration needs them.
 *
 * Op semantics summary:
 *   - addFile:     copy `source` (relative to migrations/files/) to `path`
 *                  (relative to the app folder). Conflict if target exists
 *                  with different content.
 *   - deleteFile:  remove `path`. Skipped silently if already absent.
 *   - renameFile:  move `from` → `to`. Conflict if `to` already exists.
 *   - patchJson:   deep-merge `set` (replace key) / `merge` (recursive merge);
 *                  remove keys named in `unset`. Conflict on invalid JSON.
 *   - replaceText: replace `find` with `replace`. If `regex` is true, `find`
 *                  is a JS regex source. Conflict (no fuzzy matching) if
 *                  `find` doesn't appear — surfaced as a sibling
 *                  `<file>.update-conflict` describing the unapplied patch.
 */
export const MigrationOpSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("addFile"),
    path: z.string().min(1),
    /** Path relative to the migration's `files/` subdirectory. */
    source: z.string().min(1),
  }),
  z.object({
    type: z.literal("deleteFile"),
    path: z.string().min(1),
  }),
  z.object({
    type: z.literal("renameFile"),
    from: z.string().min(1),
    to: z.string().min(1),
  }),
  z.object({
    type: z.literal("patchJson"),
    path: z.string().min(1),
    set: z.record(z.unknown()).optional(),
    unset: z.array(z.string()).optional(),
    merge: z.record(z.unknown()).optional(),
  }),
  z.object({
    type: z.literal("replaceText"),
    path: z.string().min(1),
    find: z.string().min(1),
    replace: z.string(),
    regex: z.boolean().optional(),
  }),
]);
export type MigrationOp = z.infer<typeof MigrationOpSchema>;

const VERSION_RE = /^\d+\.\d+\.\d+$/;

export const MigrationSchema = z.object({
  /** Stable identifier; convention: "<from>_to_<to>". */
  id: z.string().min(1),
  from: z.string().regex(VERSION_RE, "expected MAJOR.MINOR.PATCH"),
  to: z.string().regex(VERSION_RE, "expected MAJOR.MINOR.PATCH"),
  description: z.string().min(1),
  ops: z.array(MigrationOpSchema),
});
export type Migration = z.infer<typeof MigrationSchema>;
