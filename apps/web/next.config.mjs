import path from "node:path";

/**
 * Next.js needs to bundle `templates/` and `infra/` (which live at the repo
 * root, NOT inside apps/web) into the serverless function for the scaffold
 * routes. `outputFileTracingRoot` widens the trace boundary;
 * `outputFileTracingIncludes` explicitly opts those directories in per-route.
 *
 * Without `outputFileTracingRoot`, Next caps tracing inside apps/web and
 * silently drops the templates from the deploy. The /api/health route reports
 * `templates.length` so the prod smoke test can flag this immediately.
 */
const repoRoot = path.resolve(process.cwd(), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    "/api/health": ["../../templates/**/*", "../../infra/**/*"],
    "/api/scaffold/preview": ["../../templates/**/*", "../../infra/**/*"],
    "/api/scaffold/zip": ["../../templates/**/*", "../../infra/**/*"],
  },
  reactStrictMode: true,
};

export default nextConfig;
