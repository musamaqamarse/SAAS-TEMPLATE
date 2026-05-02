import { describe, it, expect } from "vitest";
import { recommend, type RecommenderAnswers } from "../lib/recommender";

const base: RecommenderAnswers = {
  team: "solo",
  audience: "b2b",
  needsMobile: false,
  needsRealtime: false,
  needsAdmin: true,
  dbPreference: "no-preference",
};

describe("recommend", () => {
  it("picks Supabase by default with no preference", () => {
    expect(recommend(base).composition.dataStack).toBe("supabase");
  });

  it("picks Firebase when SQL is not preferred and mobile + real-time are both on", () => {
    expect(
      recommend({
        ...base,
        dbPreference: "no-preference",
        needsMobile: true,
        needsRealtime: true,
      }).composition.dataStack
    ).toBe("firebase");
  });

  it("respects an explicit SQL preference even if mobile + real-time are on", () => {
    expect(
      recommend({
        ...base,
        dbPreference: "sql",
        needsMobile: true,
        needsRealtime: true,
      }).composition.dataStack
    ).toBe("supabase");
  });

  it("picks Next.js API for solo consumer apps", () => {
    expect(
      recommend({ ...base, team: "solo", audience: "consumer" }).composition.backend
    ).toBe("nextjs-api");
  });

  it("picks FastAPI for team B2B apps", () => {
    expect(
      recommend({ ...base, team: "team", audience: "b2b" }).composition.backend
    ).toBe("fastapi");
  });

  it("picks Next.js website for consumer audience (SEO matters)", () => {
    expect(
      recommend({ ...base, audience: "consumer" }).composition.website
    ).toBe("nextjs");
  });

  it("picks React+Vite for solo + B2B + no admin (SPA dashboard)", () => {
    expect(
      recommend({ ...base, team: "solo", audience: "b2b", needsAdmin: false }).composition.website
    ).toBe("reactjs");
  });

  it("includes Flutter only when needsMobile is true", () => {
    expect(recommend({ ...base, needsMobile: false }).composition.mobile).toBe("none");
    expect(recommend({ ...base, needsMobile: true }).composition.mobile).toBe("flutter");
  });

  it("returns at least one rationale per pick", () => {
    const out = recommend(base);
    // 6 axes → expect 6 rationale lines minimum
    expect(out.rationale.length).toBeGreaterThanOrEqual(6);
  });

  it("always includes infra by default", () => {
    expect(recommend(base).composition.includeInfra).toBe(true);
  });
});
