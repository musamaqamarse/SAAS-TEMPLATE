import Link from "next/link";
import Questionnaire from "@/components/recommender/Questionnaire";

export const metadata = { title: "Stack recommender — create-saas" };

export default function RecommendPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← back
      </Link>
      <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">Pick a stack</h1>
      <p className="mt-3 max-w-prose text-muted-foreground">
        Six questions. The recommendation pre-fills the configurator — every choice stays editable.
        Don't overthink any answer; you can change everything later.
      </p>
      <div className="mt-10">
        <Questionnaire />
      </div>
    </main>
  );
}
