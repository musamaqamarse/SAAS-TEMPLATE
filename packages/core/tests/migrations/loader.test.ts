import { describe, expect, it } from "vitest";
import { buildMigrationChain } from "../../src/migrations/loader.js";
import type { Migration } from "../../src/migrations/schema.js";

function m(from: string, to: string, ops: Migration["ops"] = []): Migration {
  return { id: `${from}_to_${to}`, from, to, description: "x", ops };
}

describe("buildMigrationChain", () => {
  it("returns an empty chain when from === to", () => {
    expect(buildMigrationChain([m("1.0.0", "1.1.0")], "1.2.0", "1.2.0")).toEqual([]);
  });

  it("walks a multi-step chain in order", () => {
    const ms = [m("1.0.0", "1.1.0"), m("1.1.0", "1.2.0"), m("1.2.0", "2.0.0")];
    const chain = buildMigrationChain(ms, "1.0.0", "2.0.0");
    expect(chain.map((c) => c.id)).toEqual(["1.0.0_to_1.1.0", "1.1.0_to_1.2.0", "1.2.0_to_2.0.0"]);
  });

  it("rejects when the chain is broken (no migration from current version)", () => {
    const ms = [m("1.0.0", "1.1.0"), m("1.2.0", "1.3.0")];
    expect(() => buildMigrationChain(ms, "1.0.0", "1.3.0")).toThrow(/No migration found from version 1\.1\.0/);
  });

  it("rejects two migrations sharing the same `from`", () => {
    const ms = [m("1.0.0", "1.1.0"), m("1.0.0", "2.0.0")];
    expect(() => buildMigrationChain(ms, "1.0.0", "2.0.0")).toThrow(/Two migrations declare from="1\.0\.0"/);
  });
});
