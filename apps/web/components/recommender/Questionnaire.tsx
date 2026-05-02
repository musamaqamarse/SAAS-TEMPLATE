"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recommend, type RecommenderAnswers } from "@/lib/recommender";

const DEFAULTS: RecommenderAnswers = {
  team: "solo",
  audience: "b2b",
  needsMobile: false,
  needsRealtime: false,
  needsAdmin: true,
  dbPreference: "no-preference",
};

interface RadioGroupProps<T extends string> {
  label: string;
  name: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; hint?: string }>;
  onChange: (next: T) => void;
}

function RadioGroup<T extends string>({ label, name, value, options, onChange }: RadioGroupProps<T>) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const id = `${name}-${opt.value}`;
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                checked ? "border-accent bg-muted" : "border-border hover:bg-muted/40"
              }`}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="mt-1"
              />
              <span>
                <span className="block font-medium">{opt.label}</span>
                {opt.hint && (
                  <span className="block text-sm text-muted-foreground">{opt.hint}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface ToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

function Toggle({ label, hint, checked, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
      />
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export default function Questionnaire() {
  const router = useRouter();
  const [answers, setAnswers] = useState<RecommenderAnswers>(DEFAULTS);
  const update = <K extends keyof RecommenderAnswers>(k: K, v: RecommenderAnswers[K]) =>
    setAnswers((prev) => ({ ...prev, [k]: v }));

  const suggestion = recommend(answers);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      dataStack: suggestion.composition.dataStack,
      backend: suggestion.composition.backend,
      website: suggestion.composition.website,
      adminPanel: suggestion.composition.adminPanel,
      mobile: suggestion.composition.mobile,
    });
    router.push(`/configure?${params.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <RadioGroup
        label="Who's building this?"
        name="team"
        value={answers.team}
        onChange={(v) => update("team", v)}
        options={[
          { value: "solo", label: "Just me", hint: "Bias toward fewer moving parts." },
          { value: "team", label: "Small team", hint: "Bias toward clearer service boundaries." },
        ]}
      />

      <RadioGroup
        label="Who are the users?"
        name="audience"
        value={answers.audience}
        onChange={(v) => update("audience", v)}
        options={[
          { value: "b2b", label: "Other businesses (B2B)", hint: "Auth + dashboards matter most." },
          { value: "consumer", label: "Consumers (B2C)", hint: "SEO + initial paint matter most." },
        ]}
      />

      <RadioGroup
        label="Database preference?"
        name="dbPreference"
        value={answers.dbPreference}
        onChange={(v) => update("dbPreference", v)}
        options={[
          { value: "sql", label: "SQL / Postgres", hint: "→ Supabase" },
          { value: "document", label: "Document / Firestore", hint: "→ Firebase" },
          { value: "no-preference", label: "No preference", hint: "We'll pick a sensible default." },
        ]}
      />

      <div className="space-y-2">
        <p className="font-medium">Anything else?</p>
        <Toggle
          label="Mobile app from day one"
          hint="Adds a Flutter app with FCM, auth, and routing pre-wired."
          checked={answers.needsMobile}
          onChange={(v) => update("needsMobile", v)}
        />
        <Toggle
          label="Real-time data (chat, presence, live updates)"
          hint="Tilts the recommendation toward Firebase if you also want mobile."
          checked={answers.needsRealtime}
          onChange={(v) => update("needsRealtime", v)}
        />
        <Toggle
          label="Internal admin panel"
          hint="A separate Next.js app with admin-role guarding."
          checked={answers.needsAdmin}
          onChange={(v) => update("needsAdmin", v)}
        />
      </div>

      <section className="rounded-md border border-border bg-muted/40 p-4">
        <p className="mb-3 font-medium">Suggested stack</p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Data stack</dt>
          <dd className="font-mono">{suggestion.composition.dataStack}</dd>
          <dt className="text-muted-foreground">Backend</dt>
          <dd className="font-mono">{suggestion.composition.backend}</dd>
          <dt className="text-muted-foreground">Website</dt>
          <dd className="font-mono">{suggestion.composition.website}</dd>
          <dt className="text-muted-foreground">Admin panel</dt>
          <dd className="font-mono">{suggestion.composition.adminPanel}</dd>
          <dt className="text-muted-foreground">Mobile</dt>
          <dd className="font-mono">{suggestion.composition.mobile}</dd>
        </dl>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted-foreground">Why?</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {suggestion.rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </details>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-accent px-5 py-3 font-medium text-accent-foreground transition hover:opacity-90"
        >
          Use this recommendation →
        </button>
        <a href="/configure" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Skip — start blank
        </a>
      </div>
    </form>
  );
}
