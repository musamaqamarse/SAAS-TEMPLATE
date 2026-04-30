import { redirect } from "next/navigation";
import { createSsrClient } from "./supabase/server";

export async function requireAdmin() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // TODO: Tighten this check before production. Suggested options:
  //  • Custom claim:   user.app_metadata?.role === "admin"
  //  • Admin table:    select 1 from admins where user_id = user.id
  //  • Email allowlist (small teams only)
  // For now, any signed-in user can access the admin panel — useful for local dev.
  return user;
}
