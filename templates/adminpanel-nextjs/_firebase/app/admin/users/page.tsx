import { adminAuth } from "@/lib/firebase/admin";

export default async function UsersPage() {
  let users: Array<{ uid: string; email?: string; metadata: { creationTime?: string; lastSignInTime?: string } }> = [];
  let error: string | null = null;
  try {
    const list = await adminAuth().listUsers(100);
    users = list.users.map((u) => ({
      uid: u.uid,
      email: u.email,
      metadata: { creationTime: u.metadata.creationTime, lastSignInTime: u.metadata.lastSignInTime },
    }));
  } catch (e) {
    error = (e as Error).message;
  }

  if (error) return <p className="text-red-500">{error}</p>;

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
              <th className="px-3 py-2">UID</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid} className="border-t">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.metadata.creationTime?.slice(0, 16)}</td>
                <td className="px-3 py-2">{u.metadata.lastSignInTime?.slice(0, 16) ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs opacity-70">{u.uid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
