import { adminClient } from "./supabase";

export interface CurrentUser {
  id: string;
  email: string | null;
  claims: Record<string, unknown>;
}

function bearer(req: Request): string {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    throw new Error("Missing bearer token");
  }
  return auth.slice(7).trim();
}

export async function requireUser(req: Request): Promise<CurrentUser> {
  const token = bearer(req);
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) throw new Error(error?.message || "Invalid token");
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    claims: (data.user as unknown as { app_metadata?: Record<string, unknown> }).app_metadata ?? {},
  };
}
