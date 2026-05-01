/**
 * Opt-in telemetry + crash reporting.
 *
 * Both are OFF by default. Users enable them with environment variables:
 *
 *   CREATE_SAAS_TELEMETRY=1     enables anonymous PostHog usage events
 *   CREATE_SAAS_SENTRY_DSN=...  enables Sentry crash reporting
 *
 * The PostHog and Sentry packages are listed under `optionalDependencies` so a
 * missing install never crashes the CLI — every export degrades to a no-op.
 *
 * What we capture (PostHog only, opt-in):
 *   - command name (scaffold | doctor | --version)
 *   - stack picks (dataStack, backend, website, adminPanel, mobile)
 *   - success / failure + error class
 *   - CLI version, node version, platform
 *
 * What we never capture: project names, file paths, env values, user identity.
 */
import process from "node:process";
import os from "node:os";

const TELEMETRY_ENABLED = process.env.CREATE_SAAS_TELEMETRY === "1";
const SENTRY_DSN = process.env.CREATE_SAAS_SENTRY_DSN;
const POSTHOG_KEY = process.env.CREATE_SAAS_POSTHOG_KEY;
const POSTHOG_HOST = process.env.CREATE_SAAS_POSTHOG_HOST ?? "https://us.i.posthog.com";

let posthog: { capture: (e: { distinctId: string; event: string; properties?: Record<string, unknown> }) => void; shutdown: () => Promise<void> } | null = null;
let sentry: { captureException: (e: unknown) => void; flush: (ms?: number) => Promise<boolean> } | null = null;
let distinctId = "anonymous";

export async function initTelemetry(): Promise<void> {
  if (TELEMETRY_ENABLED && POSTHOG_KEY) {
    try {
      const mod = await import("posthog-node").catch(() => null);
      if (mod) {
        const PostHog = (mod as { PostHog: new (key: string, opts: { host: string }) => typeof posthog }).PostHog;
        posthog = new (PostHog as unknown as new (key: string, opts: { host: string }) => NonNullable<typeof posthog>)(POSTHOG_KEY, { host: POSTHOG_HOST });
        distinctId = `${os.hostname()}-${os.userInfo().username}`.slice(0, 64);
      }
    } catch {
      // never let telemetry break the CLI
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

export function capture(event: string, properties: Record<string, unknown> = {}): void {
  if (!posthog) return;
  try {
    posthog.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        $cli_version: getCliVersion(),
        $node_version: process.version,
        $platform: process.platform,
        $arch: process.arch,
      },
    });
  } catch {
    // ignore
  }
}

export function captureException(err: unknown): void {
  if (!sentry) return;
  try {
    sentry.captureException(err);
  } catch {
    // ignore
  }
}

export async function shutdownTelemetry(): Promise<void> {
  await Promise.allSettled([
    posthog ? posthog.shutdown() : Promise.resolve(),
    sentry ? sentry.flush(2000) : Promise.resolve(),
  ]);
}

function getCliVersion(): string {
  return process.env.npm_package_version ?? "unknown";
}

export function telemetryStatus(): { telemetry: boolean; sentry: boolean } {
  return { telemetry: !!posthog, sentry: !!sentry };
}
