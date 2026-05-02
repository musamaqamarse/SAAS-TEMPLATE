/**
 * Encode / decode a configurator state into a URL-safe string. Used for
 * shareable links — the only "history" mechanism in Phase 2 since accounts
 * (#15) are descoped.
 *
 * Wire shape: a thin object with project identity + composition. We do NOT
 * encode the full validated `WebScaffoldConfig` because the project name
 * fully derives kebab/snake/pascal/bundleId — re-deriving on decode keeps
 * the URL short and immune to upstream schema additions.
 *
 * Encoding: JSON → pako.deflateRaw → base64url. ~250 bytes JSON →
 * ~270 chars in the URL. No DB round-trip; bookmarking the URL is the
 * user's "save my config" mechanism.
 */
import { deflateRaw, inflateRaw } from "pako";
import type { DataStack, BackendChoice, WebsiteChoice, AdminChoice, MobileChoice } from "@create-saas/core/schemas";

export interface ShareableConfig {
  projectName: string;
  description: string;
  bundleVendor: string;
  dataStack: DataStack;
  backend: BackendChoice;
  website: WebsiteChoice;
  adminPanel: AdminChoice;
  mobile: MobileChoice;
  includeInfra: boolean;
}

const SCHEMA_TAG = 1; // bump if the wire shape changes

function toBase64Url(bytes: Uint8Array): string {
  // Cross-runtime: btoa exists in browser + Node 18+; convert via binary string.
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = (typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64"));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): Uint8Array {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((encoded.length + 3) % 4);
  const binary = (typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeShareable(config: ShareableConfig): string {
  const payload = JSON.stringify({ v: SCHEMA_TAG, c: config });
  const compressed = deflateRaw(payload, { level: 9 });
  return toBase64Url(compressed);
}

export function decodeShareable(token: string): ShareableConfig | null {
  try {
    const bytes = fromBase64Url(token);
    const json = inflateRaw(bytes, { to: "string" });
    const parsed = JSON.parse(json) as { v?: number; c?: unknown };
    if (parsed.v !== SCHEMA_TAG || !parsed.c) return null;
    return parsed.c as ShareableConfig;
  } catch {
    return null;
  }
}
