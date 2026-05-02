import { test, expect } from "@playwright/test";

/**
 * Encode a config in the configurator → click "Copy share link" → the URL
 * bar updates to /configure?share=<token>. Open that URL in a fresh context
 * and assert the form is pre-filled with the same values. Reading from the
 * address bar (rather than the clipboard) is intentional: clipboard
 * permissions are flaky across CI runners and the configurator updates the
 * URL bar unconditionally as a fallback.
 */
test("share link round-trips a config", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/configure");

  await page.fill("#projectName", "Sharable Project");
  await page.selectOption("#dataStack", "firebase");
  await page.selectOption("#backend", "nextjs-api");
  await page.selectOption("#website", "reactjs");

  await page.getByRole("button", { name: /Copy share link/i }).click();
  await page.waitForURL(/\/configure\?share=/);

  const url = page.url();
  expect(url).toContain("/configure?share=");
  await ctx.close();

  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.goto(url);

  await expect(page2.locator("#projectName")).toHaveValue("Sharable Project");
  await expect(page2.locator("#dataStack")).toHaveValue("firebase");
  await expect(page2.locator("#backend")).toHaveValue("nextjs-api");
  await expect(page2.locator("#website")).toHaveValue("reactjs");

  await ctx2.close();
});
