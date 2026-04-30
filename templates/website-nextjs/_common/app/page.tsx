import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">__PROJECT_NAME__</h1>
      <p className="text-lg opacity-80 max-w-prose text-center">__DESCRIPTION__</p>
      <div className="flex gap-3">
        <Link href="/login" className="px-4 py-2 rounded-md border">Log in</Link>
        <Link href="/signup" className="px-4 py-2 rounded-md bg-brand text-brand-fg">Get started</Link>
      </div>
    </main>
  );
}
