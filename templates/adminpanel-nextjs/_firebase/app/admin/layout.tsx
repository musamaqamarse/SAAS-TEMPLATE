"use client";
import Shell from "@/components/Shell";
import LogoutButton from "@/components/LogoutButton";
import { useRequireAdmin } from "@/lib/admin-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useRequireAdmin();
  return <Shell logoutButton={<LogoutButton />}>{children}</Shell>;
}
