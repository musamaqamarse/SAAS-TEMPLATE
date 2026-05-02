/**
 * Server-side telemetry for the web app. Mirrors the CLI's pattern in
 * `packages/cli/src/telemetry.ts` deliberately:
 *
 *   - Same env-var contract:
 *       CREATE_SAAS_TELEMETRY=1     enables PostHog
 *       CREATE_SAAS_POSTHOG_KEY=…   required to send
 *       CREATE_SAAS_SENTRY_DSN=…    enables Sentry
 *   - PostHog + Sentry are `optionalDependencies`; missing installs degrade
 *     to no-ops, never crash the route.
 *   - All events are tagged `source: "web"` so they don't pollute CLI signal.
 *
 * Lazy-init pattern: routes call `await getTelemetry()` once per request and
 * the singleton imports the optional deps on first use. Subsequent requests
 * on the same warm container skip the import.
 */
import process from "node:process";
import os from "node:os";

const TELEMETRY_ENABLED = process.env.CREATE_SAAS_TELEMETRY === "1";
const SENTRY_DSN = process.env.CREATE_SAAS_SENTRY_DSN;
const POSTHOG_KEY = process.env.CREATE_SAAS_POSTHOG_KEY;
const POSTHOG_HOST = process.env.CREATE_SAAS_POSTHOG_HOST ?? "https://us.i.posthog.com";

interface PostHogClient {
  capture: (e: { distinctId: string; event: string; properties?: Record<string, unknown> }) => void;
  shutdown: () => Promise<void>;
}
interface SentryClient {
  captureException: (e: unknown) => void;
  flush: (ms?: number) => Promise<boolean>;
}

let posthog: PostHogClient | null = null;
let sentry: SentryClient | null = null;
let initPromise: Promise<void> | null = null;
const distinctIdAnonBase = `web-${os.hostname()}`.slice(0, 64);

async function init(): Promise<void> {
  if (TELEMETRY_ENABLED && POSTHOG_KEY) {
    try {
      const mod = await import("posthog-node").catch(() => null);
      if (mod) {
        const PostHog = (mod as { PostHog: new (key: string, opts: { host: string }) => PostHogClient }).PostHog;
        posthog = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST });
      }
    } catch {
      // never let telemetry break a request
    }
  }
  if (SENTRY_DSN) {
    try {
      const mod = await import("@sentry/node").catch(() => null);
      if (mod) {
        const Sentry = mod as unknown as {
          init: (opts: { dsn: string; tracesSampleRate?: number }) => void;
          captureException: (e: unknown) => void;
          flush: (ms?: number) => Promise<boolean>;
        };
        Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 0 });
        sentry = { captureException: Sentry.captureException, flush: Sentry.flush };
      }
    } catch {
      // ignore
    }
  }
}

async function ensureInit(): Promise<void> {
  if (!initPromise) initPromise = init();
  return initPromise;
}

/**
 * Per-request capture. Distinct ID is anonymous + hashed-by-IP-style — for
 * Phase 2 we don't have user accounts, so the same warm container hostname is
 * the closest stand-in. Good enough for "how many ZIPs did we serve."
 */
export async function captureEvent(
  event: string,
  properties: Record<string, unknown> = {},
  request?: Request
): Promise<void> {
  await ensureInit();
  if (!posthog) return;
  try {
    const distinctId = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || distinctIdAnonBase;
    posthog.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        source: "web",
        $web_version: process.env.npm_package_version ?? "0.1.0",
        $node_version: process.version,
      },
    });
  } catch {
    // ignore
  }
}

export async function captureException(err: unknown): Promise<void> {
  await ensureInit();
  if (!sentry) return;
  try {
    sentry.captureException(err);
  } catch {
    // ignore
  }
}

export function telemetryStatus(): { telemetry: boolean; sentry: boolean } {
  return { telemetry: !!posthog, sentry: !!sentry };
}
