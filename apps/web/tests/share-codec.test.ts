import { describe, it, expect } from "vitest";
import { encodeShareable, decodeShareable, type ShareableConfig } from "../lib/share-codec";

const sample: ShareableConfig = {
  projectName: "My Cool App",
  description: "A test config",
  bundleVendor: "com.acme",
  dataStack: "supabase",
  backend: "fastapi",
  website: "nextjs",
  adminPanel: "nextjs",
  mobile: "flutter",
  includeInfra: true,
};

describe("share-codec", () => {
  it("round-trips a config losslessly", () => {
    const token = encodeShareable(sample);
    const decoded = decodeShareable(token);
    expect(decoded).toEqual(sample);
  });

  it("produces a URL-safe token (no '+', '/', '=', '?', '#')", () => {
    const token = encodeShareable(sample);
    expect(token).not.toMatch(/[+/=?#]/);
  });

  it("token stays comfortably under 1500 chars (URL-friendly)", () => {
    const token = encodeShareable(sample);
    expect(token.length).toBeLessThan(1500);
  });

  it("returns null on garbage input", () => {
    expect(decodeShareable("definitely-not-a-real-token")).toBeNull();
    expect(decodeShareable("")).toBeNull();
  });

  it("returns null on a wrong schema version", () => {
    // Encode a payload with v=999 by hand and confirm decode rejects it.
    const { deflateRaw } = require("pako") as typeof import("pako");
    const json = JSON.stringify({ v: 999, c: sample });
    const bytes = deflateRaw(json) as Uint8Array;
    const b64 = Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeShareable(b64)).toBeNull();
  });
});
