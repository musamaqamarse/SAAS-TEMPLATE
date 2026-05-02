import path from "node:path";
import { Readable } from "node:stream";
import archiver from "archiver";
import { NextResponse } from "next/server";
import { runScaffold, WebScaffoldConfigSchema } from "@/lib/scaffold-runner";
import { captureEvent, captureException } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Stream a `.zip` of the full scaffold. The archive is rooted at the project
 * folder so extracting yields `<projectKebab>/<app-folders>/...`. Each app
 * subfolder is structured to be `git init`'d on its own — matching what the
 * CLI produces with `--create-github-repos` minus the actual git/GitHub side
 * effects (descoped from Phase 2 per user direction).
 *
 * Streaming, never buffered: a Flutter-bearing scaffold is ~80MB and a
 * `Buffer.concat()` would OOM warm Vercel containers. The temp dir is
 * deleted in the archiver `end`/`error` events so we don't leak between
 * invocations on the same warm container.
 */
export async function POST(req: Request) {
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

  const start = Date.now();
  let cleanup: (() => Promise<void>) | null = null;
  try {
    const run = await runScaffold(parsed.data);
    cleanup = run.cleanup;
    const projectKebab = parsed.data.projectKebab;

    void captureEvent(
      "scaffold_zip",
      {
        dataStack: parsed.data.dataStack,
        backend: parsed.data.backend,
        website: parsed.data.website,
        adminPanel: parsed.data.adminPanel,
        mobile: parsed.data.mobile,
        includeInfra: parsed.data.includeInfra,
        durationMs: Date.now() - start,
        apps: run.result.scaffolded.length,
      },
      req
    );

    const archive = archiver("zip", { zlib: { level: 6 } });
    // The archive directory is the temp/<projectKebab>/, but inside the zip
    // we want the entries to live under `<projectKebab>/...` so an
    // `unzip foo.zip` produces a single folder, not a flattened mess.
    archive.directory(run.destDir, projectKebab);
    archive.finalize().catch((err) => {
      // Surface to logs; the stream will emit 'error' too.
      console.error("archiver finalize error", err);
    });

    const finishCleanup = async () => {
      if (cleanup) {
        try {
          await cleanup();
        } catch (e) {
          console.error("temp dir cleanup failed", e);
        }
        cleanup = null;
      }
    };
    archive.on("end", () => void finishCleanup());
    archive.on("error", () => void finishCleanup());

    // Convert the Node Readable (archiver) into a Web ReadableStream for the
    // App Router Response. Cast: TypeScript's Web/Node stream types overlap
    // structurally but TS doesn't infer it.
    const webStream = Readable.toWeb(archive) as unknown as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${projectKebab}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (cleanup) await cleanup().catch(() => {});
    void captureEvent(
      "scaffold_zip_failed",
      { error_class: err instanceof Error ? err.name : "Unknown" },
      req
    );
    void captureException(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 422 }
    );
  }
}
