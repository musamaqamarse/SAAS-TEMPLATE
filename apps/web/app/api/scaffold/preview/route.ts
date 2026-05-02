import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { runScaffold, WebScaffoldConfigSchema } from "@/lib/scaffold-runner";
import { captureEvent, captureException } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface TreeEntry {
  path: string;
  bytes: number;
  kind: "file" | "dir";
}

async function walkTree(root: string): Promise<TreeEntry[]> {
  const out: TreeEntry[] = [];
  async function recurse(dir: string, prefix: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push({ path: rel, bytes: 0, kind: "dir" });
        await recurse(abs, rel);
      } else if (entry.isFile()) {
        const stat = await fs.stat(abs);
        out.push({ path: rel, bytes: stat.size, kind: "file" });
      }
    }
  }
  await recurse(root, "");
  return out;
}

/**
 * Scaffold to a temp dir, walk the result, return file metadata, delete the
 * temp dir. Powers the live folder-tree preview in the configurator. No bytes
 * are returned — `/api/scaffold/zip` is the path for actual content.
 */
export async function POST(req: Request) {
  const start = Date.now();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = WebScaffoldConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid config", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  let cleanup: (() => Promise<void>) | null = null;
  try {
    const run = await runScaffold(parsed.data);
    cleanup = run.cleanup;
    const tree = await walkTree(run.destDir);
    void captureEvent(
      "scaffold_preview",
      {
        dataStack: parsed.data.dataStack,
        backend: parsed.data.backend,
        website: parsed.data.website,
        adminPanel: parsed.data.adminPanel,
        mobile: parsed.data.mobile,
        durationMs: Date.now() - start,
        files: tree.filter((t) => t.kind === "file").length,
      },
      req
    );
    return NextResponse.json({
      tree,
      durationMs: Date.now() - start,
      apps: run.result.scaffolded.map((s) => ({
        name: s.meta.name,
        displayName: s.meta.displayName,
        folder: s.destFolderName,
      })),
    });
  } catch (err) {
    void captureEvent(
      "scaffold_preview_failed",
      { error_class: err instanceof Error ? err.name : "Unknown" },
      req
    );
    void captureException(err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      },
      { status: 422 }
    );
  } finally {
    if (cleanup) await cleanup();
  }
}
