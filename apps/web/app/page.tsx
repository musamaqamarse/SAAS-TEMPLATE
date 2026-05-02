import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm uppercase tracking-widest text-muted-foreground">
        create-saas
      </p>
      <h1 className="mb-6 text-balance text-4xl font-semibold leading-tight sm:text-5xl">
        Scaffold a SaaS in under three minutes.
      </h1>
      <p className="mb-10 max-w-xl text-lg text-muted-foreground">
        Pick your stack, click Generate, download a working multi-app project.
        Backend, website, admin panel, mobile — wired to Supabase or Firebase,
        deployable on day one. No accounts, no sign-up.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/configure"
          className="rounded-md bg-accent px-5 py-3 font-medium text-accent-foreground transition hover:opacity-90"
        >
          Configure your project →
        </Link>
        <Link
          href="/recommend"
          className="rounded-md border border-border px-5 py-3 font-medium transition hover:bg-muted"
        >
          Not sure? Get a recommendation
        </Link>
      </div>

      <p className="mt-12 text-sm text-muted-foreground">
        Prefer the CLI?{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          npx create-saas
        </code>{" "}
        gives you the same engine, plus optional GitHub push.
      </p>
    </main>
  );
}
