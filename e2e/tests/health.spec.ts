import { test, expect } from "@playwright/test";

/**
 * /api/health is the prod smoke target. It MUST report 6 templates — anything
 * less means Next.js's `outputFileTracingIncludes` silently dropped the
 * shared `templates/` directory from the deployed function. Treat any
 * `templatesCount !== 6` as a deploy-blocker.
 */
test("/api/health reports all 6 templates and 2 infra stacks", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);

  const body = (await res.json()) as {
    ok: boolean;
    templates: string[];
    infraStacks: string[];
    templatesCount: number;
  };
  expect(body.ok).toBe(true);
  expect(body.templatesCount).toBe(6);
  expect(body.templates).toContain("backend-fastapi");
  expect(body.templates).toContain("backend-nextjs-api");
  expect(body.templates).toContain("website-nextjs");
  expect(body.templates).toContain("website-reactjs");
  expect(body.templates).toContain("adminpanel-nextjs");
  expect(body.templates).toContain("mobileapp-flutter");
  expect(body.infraStacks).toEqual(expect.arrayContaining(["supabase", "firebase"]));
});
