import type { ReactNode } from "react";
import Link from "next/link";

export default function Shell({ children, logoutButton }: { children: ReactNode; logoutButton?: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r p-4 flex flex-col bg-white dark:bg-black/30">
        <h2 className="text-lg font-semibold mb-4">__PROJECT_NAME__</h2>
        <nav className="flex flex-col gap-1 text-sm flex-1">
          <Link href="/admin" className="px-2 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5">Overview</Link>
          <Link href="/admin/users" className="px-2 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5">Users</Link>
          <Link href="/admin/settings" className="px-2 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5">Settings</Link>
        </nav>
        {logoutButton && <div className="pt-4 border-t">{logoutButton}</div>}
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
