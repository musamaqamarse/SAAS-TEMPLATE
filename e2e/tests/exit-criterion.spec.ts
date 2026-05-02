import { test, expect } from "@playwright/test";

/**
 * The Phase 2 exit criterion: a non-CLI user lands on the site and walks
 * away with a scaffold in under three minutes. We measure landing → ZIP
 * download with defaults. Failing this blocks the PR.
 *
 * Three minutes is generous on purpose — Vercel cold start + a Flutter-
 * bearing scaffold can land at 30s on a slow link. We still log the actual
 * timing so trend regressions are visible in CI output.
 */
test("landing → ZIP download in under 3 minutes (defaults)", async ({ page }) => {
  const start = Date.now();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Scaffold a SaaS/i })).toBeVisible();

  await page.getByRole("link", { name: /Configure your project/i }).click();
  await page.waitForURL(/\/configure/);

  await page.fill("#projectName", "Exit Criterion");

  const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("button", { name: "Download .zip" }).click();
  const dl = await downloadPromise;
  expect(dl.suggestedFilename()).toBe("exit-criterion.zip");

  const elapsed = Date.now() - start;
  console.log(`exit-criterion: landing → ZIP took ${elapsed}ms`);
  expect(elapsed).toBeLessThan(180_000);
});
