import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3010";

/**
 * Playwright E2E for the create-saas web funnel.
 *
 * The `webServer` block boots `apps/web` in production mode (after a build)
 * and tears it down on exit. Tests target chromium only — adding webkit /
 * firefox triples CI time for minimal extra signal at this stage.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Build is expected to have run already (CI does it as a separate step;
        // locally use `pnpm --filter @create-saas/web build` first). `next start`
        // is fast — re-running build inside webServer would balloon test time.
        command: "pnpm --filter @create-saas/web start",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
