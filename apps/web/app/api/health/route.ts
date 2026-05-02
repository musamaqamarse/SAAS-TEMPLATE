import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { findTemplatesRoot, findInfraRoot } from "@/lib/scaffold-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health probe used by the prod smoke test. Critically, it reports the count
 * of `_template.json` files visible at runtime — if Next.js's
 * `outputFileTracingIncludes` ever silently drops the templates from the
 * deploy, this drops to 0 and the smoke test fails the deploy. Do not
 * shortcut this to a static "ok" — the dynamic check is the point.
 */
export async function GET() {
  const start = Date.now();
  try {
    const templatesRoot = findTemplatesRoot();
    const infraRoot = findInfraRoot();
    const entries = await fs.readdir(templatesRoot, { withFileTypes: true });
    const templates: string[] = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      try {
        await fs.access(path.join(templatesRoot, e.name, "_template.json"));
        templates.push(e.name);
      } catch {
        // Not a valid template directory — ignore.
      }
    }
    const infraStacks = (await fs.readdir(infraRoot, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    return NextResponse.json({
      ok: true,
      templates,
      infraStacks,
      templatesCount: templates.length,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      },
      { status: 500 }
    );
  }
}
