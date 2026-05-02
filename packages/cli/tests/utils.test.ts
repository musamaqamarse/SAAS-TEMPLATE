import { describe, it, expect } from "vitest";
import { toBundleId, toKebab, toPascal, toSnake } from "../src/utils.js";

describe("string transformers", () => {
  describe("toKebab", () => {
    it("lowercases and dashes spaces", () => {
      expect(toKebab("My Cool App")).toBe("my-cool-app");
    });
    it("splits camelCase", () => {
      expect(toKebab("myCoolApp")).toBe("my-cool-app");
    });
    it("strips disallowed chars", () => {
      expect(toKebab("My @Cool App!")).toBe("my-cool-app");
    });
    it("collapses multiple separators", () => {
      expect(toKebab("my___cool   app")).toBe("my-cool-app");
    });
    it("trims leading/trailing dashes", () => {
      expect(toKebab("  --foo--  ")).toBe("foo");
    });
  });

  describe("toSnake", () => {
    it("returns underscore-separated lower-case", () => {
      expect(toSnake("My Cool App")).toBe("my_cool_app");
    });
  });

  describe("toPascal", () => {
    it("returns PascalCase", () => {
      expect(toPascal("my cool app")).toBe("MyCoolApp");
    });
    it("handles single word", () => {
      expect(toPascal("foo")).toBe("Foo");
    });
  });

  describe("toBundleId", () => {
    it("strips dashes and prepends vendor", () => {
      expect(toBundleId("my-cool-app", "com.acme")).toBe("com.acme.mycoolapp");
    });
    it("defaults vendor to com.example", () => {
      expect(toBundleId("foo")).toBe("com.example.foo");
    });
  });
});
