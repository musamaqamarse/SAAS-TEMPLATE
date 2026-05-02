import { test, expect } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";

/**
 * The funnel: configure → download. Asserts the ZIP arrives, looks like a
 * zip, and contains the expected top-level marker files. We don't extract
 * here — that's the unit-level scaffold e2e's job in core.
 */
test("anonymous user can download a ZIP from /configure", async ({ page }) => {
  await page.goto("/configure");

  // Pick a name that derives a clean kebab.
  await page.fill("#projectName", "Smoke Test");

  // Defaults are supabase + fastapi + nextjs + admin + no mobile + infra.
  // Just kick the download.
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByRole("button", { name: "Download .zip" }).click();
  const dl = await downloadPromise;

  expect(dl.suggestedFilename()).toBe("smoke-test.zip");

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "e2e-zip-"));
  const zipPath = path.join(tmp, dl.suggestedFilename());
  await dl.saveAs(zipPath);

  const stat = await fs.stat(zipPath);
  expect(stat.size).toBeGreaterThan(10_000); // realistic floor for a multi-app scaffold

  // Magic bytes: ZIP files start with "PK\x03\x04"
  const fd = await fs.open(zipPath, "r");
  try {
    const head = Buffer.alloc(4);
    await fd.read(head, 0, 4, 0);
    expect(head.subarray(0, 2).toString("binary")).toBe("PK");
  } finally {
    await fd.close();
  }

  // The download success card should appear with extraction instructions.
  await expect(page.getByText(/Downloaded smoke-test\.zip/i)).toBeVisible();
  await expect(page.getByText(/Next steps/i)).toBeVisible();

  await fs.rm(tmp, { recursive: true, force: true });
});
