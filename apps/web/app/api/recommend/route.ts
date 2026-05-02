import { NextResponse } from "next/server";
import { RecommenderAnswersSchema, recommend } from "@/lib/recommender";
import { captureEvent } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server mirror of the client-side recommender. Exists so the marketing site
 * (and future docs/AI integrations) can embed the questionnaire and link
 * straight into a hot configurator URL without bundling the client logic.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RecommenderAnswersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid answers", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const suggestion = recommend(parsed.data);
  void captureEvent(
    "recommend",
    {
      ...parsed.data,
      suggested: suggestion.composition,
    },
    req
  );
  return NextResponse.json(suggestion);
}
