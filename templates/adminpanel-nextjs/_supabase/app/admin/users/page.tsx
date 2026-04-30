import { createAdminClient } from "@/lib/supabase/server";

export default async function UsersPage() {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) return <p className="text-red-500">{error.message}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="rounded-lg border bg-white dark:bg-black/30 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-black/5 dark:bg-white/5 text-left">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Last sign-in</th>
              <th className="px-3 py-2">ID</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.created_at?.slice(0, 10)}</td>
                <td className="px-3 py-2">{u.last_sign_in_at?.slice(0, 10) ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs opacity-70">{u.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
