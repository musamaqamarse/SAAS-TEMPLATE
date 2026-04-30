import type { ReactNode } from "react";
import Shell from "@/components/Shell";
import LogoutButton from "@/components/LogoutButton";
import { requireAdmin } from "@/lib/admin-guard";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return <Shell logoutButton={<LogoutButton />}>{children}</Shell>;
}
