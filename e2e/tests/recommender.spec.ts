import { test, expect } from "@playwright/test";

/**
 * Answer 6 questions in /recommend, click the CTA, land on /configure with
 * the suggested values pre-filled. The recommender's logic itself is
 * unit-tested under apps/web/tests; this is the UI integration check.
 */
test("recommender pre-fills the configurator", async ({ page }) => {
  await page.goto("/recommend");

  // Answers picked to drive a deterministic recommendation:
  //   team B2B + SQL preference + admin needed + mobile + real-time
  //   → supabase + fastapi + nextjs + admin + flutter
  await page.getByLabel("Small team").check();
  await page.getByLabel("Other businesses (B2B)").check();
  await page.getByLabel("SQL / Postgres").check();
  await page.getByLabel(/Mobile app from day one/).check();
  // "Internal admin panel" should already be checked by default; assert + leave.
  await expect(page.getByLabel(/Internal admin panel/)).toBeChecked();

  await page.getByRole("button", { name: /Use this recommendation/i }).click();

  await page.waitForURL(/\/configure\?/);
  await expect(page.locator("#dataStack")).toHaveValue("supabase");
  await expect(page.locator("#backend")).toHaveValue("fastapi");
  await expect(page.locator("#website")).toHaveValue("nextjs");
});
