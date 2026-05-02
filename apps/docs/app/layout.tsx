import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "create-saas docs",
  description: "Reference and guides for the create-saas CLI and headless engine.",
};

const NAV: Array<{ href: string; label: string; group?: string }> = [
  { href: "/", label: "Overview" },
  { href: "/quickstart", label: "Quickstart", group: "Guides" },
  { href: "/reference/cli", label: "CLI flags", group: "Reference" },
  { href: "/reference/scaffold-config", label: "ScaffoldConfig schema", group: "Reference" },
  { href: "/reference/saas-config", label: "saas.config.json", group: "Reference" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <div className="mx-auto flex max-w-6xl gap-12 px-6 py-10">
          <aside className="hidden w-56 shrink-0 lg:block">
            <Link href="/" className="block text-sm font-semibold uppercase tracking-widest text-zinc-500">
              create-saas docs
            </Link>
            <nav className="mt-6 space-y-4 text-sm">
              {Object.entries(
                NAV.reduce<Record<string, typeof NAV>>((acc, item) => {
                  const k = item.group ?? "";
                  acc[k] = acc[k] || [];
                  acc[k].push(item);
                  return acc;
                }, {})
              ).map(([group, items]) => (
                <div key={group}>
                  {group && (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {group}
                    </p>
                  )}
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
