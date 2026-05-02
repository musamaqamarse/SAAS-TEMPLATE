// The marketing site's URL of the app/configurator. Override at deploy via
// NEXT_PUBLIC_APP_URL; defaults to the local dev port for the web app.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="flex min-h-dvh flex-col justify-center py-16">
        <p className="mb-3 text-sm uppercase tracking-widest text-zinc-400">create-saas</p>
        <h1 className="mb-6 text-balance text-5xl font-semibold leading-tight sm:text-6xl">
          Scaffold a working SaaS in three minutes.
        </h1>
        <p className="mb-10 max-w-2xl text-lg text-zinc-300">
          Backend, website, admin panel, mobile app, and infra — wired to Supabase or Firebase,
          deployable on day one. No accounts, no signup. Pick your stack, click Generate, walk away
          with a real project.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={`${APP_URL}/configure`}
            className="rounded-md bg-white px-5 py-3 font-medium text-zinc-950 transition hover:bg-zinc-200"
          >
            Configure your project →
          </a>
          <a
            href={`${APP_URL}/recommend`}
            className="rounded-md border border-zinc-700 px-5 py-3 font-medium transition hover:bg-zinc-900"
          >
            Get a stack recommendation
          </a>
          <a
            href="https://github.com/usama-qamar/create-saas"
            className="rounded-md border border-zinc-800 px-5 py-3 font-medium text-zinc-300 transition hover:bg-zinc-900"
          >
            Star on GitHub
          </a>
        </div>
        <p className="mt-12 text-sm text-zinc-400">
          Prefer the CLI?{" "}
          <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-xs">
            npx create-saas
          </code>{" "}
          gives you the same engine, plus optional GitHub push.
        </p>
      </section>

      <section className="grid gap-6 border-t border-zinc-900 py-16 sm:grid-cols-3">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Headless engine</p>
          <p className="text-zinc-300">
            CLI, web UI, and any future SDK call the same <code className="font-mono">scaffold(config)</code>. No drift.
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Six combinations</p>
          <p className="text-zinc-300">
            FastAPI / Next.js API. Next.js / Vite. Admin. Flutter. Supabase or Firebase. Stay sharp on what you ship.
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">AI-tool ready</p>
          <p className="text-zinc-300">
            Every scaffold ships <code className="font-mono">CLAUDE.md</code>, <code className="font-mono">agents.md</code>, and{" "}
            <code className="font-mono">.cursorrules</code> tuned to the chosen stack.
          </p>
        </div>
      </section>

      <footer className="border-t border-zinc-900 py-10 text-sm text-zinc-500">
        MIT licensed · <a className="underline-offset-4 hover:underline" href="https://github.com/usama-qamar/create-saas">github</a>
      </footer>
    </main>
  );
}
