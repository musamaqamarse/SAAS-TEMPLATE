import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <LogoutButton />
      </header>
      <p className="opacity-80">Signed in as <strong>{user.email}</strong></p>
      <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded overflow-x-auto">
        {JSON.stringify({ id: user.id, email: user.email }, null, 2)}
      </pre>
    </main>
  );
}
