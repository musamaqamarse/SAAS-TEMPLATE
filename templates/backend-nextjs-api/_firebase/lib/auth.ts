import { adminAuth } from "./firebase";

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
  const decoded = await adminAuth().verifyIdToken(token);
  return {
    id: decoded.uid,
    email: decoded.email ?? null,
    claims: decoded as unknown as Record<string, unknown>,
  };
}
