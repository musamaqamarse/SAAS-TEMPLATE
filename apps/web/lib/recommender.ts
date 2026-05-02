/**
 * Stack recommender — pure function. Takes the questionnaire answers and
 * returns a partial `WebScaffoldConfig` plus a per-pick rationale. The
 * configurator pre-fills these defaults; every field stays user-editable.
 *
 * No HTTP, no React, no DB. Reused by both `/recommend` (client-side) and
 * `/api/recommend` (server mirror for marketing-site embeds).
 */
import { z } from "zod";
import type { WebScaffoldConfig } from "./scaffold-runner";

export const RecommenderAnswersSchema = z.object({
  team: z.enum(["solo", "team"]),
  audience: z.enum(["b2b", "consumer"]),
  needsMobile: z.boolean(),
  needsRealtime: z.boolean(),
  needsAdmin: z.boolean(),
  dbPreference: z.enum(["sql", "document", "no-preference"]),
});
export type RecommenderAnswers = z.infer<typeof RecommenderAnswersSchema>;

export interface RecommenderSuggestion {
  /** Composition fields only — project identity (name, kebab, bundle id) is supplied by the user later. */
  composition: Pick<
    WebScaffoldConfig,
    "dataStack" | "backend" | "website" | "adminPanel" | "mobile" | "includeInfra"
  >;
  rationale: string[];
}

export function recommend(answers: RecommenderAnswers): RecommenderSuggestion {
  const rationale: string[] = [];

  // --- dataStack ------------------------------------------------------------
  let dataStack: WebScaffoldConfig["dataStack"];
  if (answers.dbPreference === "sql") {
    dataStack = "supabase";
    rationale.push("Supabase: you wanted SQL — Postgres + RLS is its strong suit.");
  } else if (answers.dbPreference === "document") {
    dataStack = "firebase";
    rationale.push("Firebase: you wanted a document DB — Firestore plus a tight mobile SDK.");
  } else if (answers.needsMobile && answers.needsRealtime) {
    dataStack = "firebase";
    rationale.push("Firebase: real-time + mobile is the combination it's best at out of the box.");
  } else {
    dataStack = "supabase";
    rationale.push("Supabase: a sensible default — Postgres scales further than most teams need, and the SDK is friendly.");
  }

  // --- backend --------------------------------------------------------------
  let backend: WebScaffoldConfig["backend"];
  if (answers.team === "team" && answers.audience === "b2b") {
    backend = "fastapi";
    rationale.push("FastAPI backend: separating the API in Python keeps it easy to staff a team and to talk to data tooling later.");
  } else if (answers.team === "solo" && answers.audience === "consumer") {
    backend = "nextjs-api";
    rationale.push("Next.js API routes: one codebase to deploy, the right call when you're solo and don't need a separate Python service.");
  } else {
    backend = "fastapi";
    rationale.push("FastAPI backend: a clear seam between the API and the frontend usually pays off as the product grows.");
  }

  // --- website --------------------------------------------------------------
  let website: WebScaffoldConfig["website"];
  if (answers.audience === "consumer") {
    website = "nextjs";
    rationale.push("Next.js website: consumer products live or die on SEO + initial paint — App Router handles both.");
  } else if (answers.team === "solo" && !answers.needsAdmin) {
    website = "reactjs";
    rationale.push("React + Vite website: a SPA is lighter when you don't need SEO and aren't shipping marketing pages out of the same codebase.");
  } else {
    website = "nextjs";
    rationale.push("Next.js website: even for B2B, server-side rendering and route-level data fetching make the auth + dashboard split easier.");
  }

  // --- adminPanel -----------------------------------------------------------
  const adminPanel: WebScaffoldConfig["adminPanel"] = answers.needsAdmin ? "nextjs" : "none";
  if (answers.needsAdmin) {
    rationale.push("Admin panel included: separating internal-user surface from the public site keeps your auth model honest from day one.");
  } else {
    rationale.push("No admin panel: you can add `create-saas add adminpanel` later when you actually need it.");
  }

  // --- mobile ---------------------------------------------------------------
  const mobile: WebScaffoldConfig["mobile"] = answers.needsMobile ? "flutter" : "none";
  if (answers.needsMobile) {
    rationale.push("Flutter mobile: one codebase for iOS + Android with FCM + auth wired up. The web ZIP includes the prerendered shell so no Flutter SDK is needed at scaffold time.");
  } else {
    rationale.push("No mobile: scaffold the apps you need today; add it later via the CLI.");
  }

  // --- includeInfra ---------------------------------------------------------
  const includeInfra = true;
  rationale.push("Infra folder included: ships migrations / rules so your data layer isn't living in someone's untracked browser tab.");

  return {
    composition: { dataStack, backend, website, adminPanel, mobile, includeInfra },
    rationale,
  };
}
