import { adminAuth } from "@/lib/firebase/admin";

async function getStats() {
  try {
    const list = await adminAuth().listUsers(1);
    return { total: list.users.length };
  } catch {
    return { total: "—" };
  }
}

export default async function Overview() {
  const stats = await getStats();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Users (page 1)" value={String(stats.total)} />
        <Stat label="Today" value="—" />
        <Stat label="MRR" value="—" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white dark:bg-black/30 p-4">
      <div className="text-xs uppercase opacity-60">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
