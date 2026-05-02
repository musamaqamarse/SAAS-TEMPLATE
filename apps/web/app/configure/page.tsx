import Link from "next/link";
import { Suspense } from "react";
import Configurator from "@/components/configurator/Configurator";

export const metadata = { title: "Configure — create-saas" };

export default function ConfigurePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← back
      </Link>
      <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">Configure your scaffold</h1>
      <p className="mt-3 max-w-prose text-muted-foreground">
        Pick your apps and stack, preview the tree, and download a ZIP. The download contains the
        full project root with each app as its own subfolder — run <code className="font-mono">git init</code> in
        each one if you want a per-app repo (matches how the CLI does it).
      </p>
      <div className="mt-10">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <Configurator />
        </Suspense>
      </div>
    </main>
  );
}
