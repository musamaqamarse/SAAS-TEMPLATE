# __PROJECT_NAME__ — Backend (Next.js API + Supabase)

> __DESCRIPTION__

Next.js API routes wired to Supabase. JWT verification via Supabase's JWKS endpoint — auto-detects HS256 (legacy projects) and ES256 (new projects). The single most common stumbling block when building a Supabase backend, handled.

**Time to first authenticated request:** ~5 minutes.

## What's pre-wired

- `requireUser()` middleware that verifies the bearer token on every protected route
- **HS256 + ES256 auto-detection** via JWKS — legacy and new Supabase projects both work
- Service-role Supabase client for admin operations
- CORS configured for the local dev ports of every other app in the scaffold
- Health + user endpoints out of the box

## Prerequisites

- Node.js 20+
- A Supabase project ([create one](https://supabase.com/dashboard))

## 1 — Set up Supabase

### Create a project
Supabase Dashboard → **New project** → pick region.

### About RLS
This backend uses the **service-role key** for admin-style operations (which bypasses RLS). For user-scoped operations, derive a Supabase client from the request's bearer token instead — that respects RLS.

## 2 — Wire env vars

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key (**KEEP SECRET**) |

> The service-role key bypasses RLS. Server-side only.

## 3 — Install + run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Endpoints

| Method | Path | Auth | Returns |
|---|---|---|---|
| `GET` | `/api/health` | none | `{ status: "ok" }` |
| `GET` | `/api/users/me` | Bearer | Caller's profile from JWT |

### Calling from a frontend

```js
const { data: { session } } = await supabase.auth.getSession();
const r = await fetch("/api/users/me", {
  headers: { Authorization: `Bearer ${session.access_token}` }
});
```

### Calling from the terminal

```bash
# 1. Sign in via the auth REST API to get a token:
curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"u@example.com","password":"..."}'
# 2. Use the access_token in the Authorization header:
curl http://localhost:3000/api/users/me -H "Authorization: Bearer <access_token>"
```

## Deploying

Vercel (best fit), Netlify, Cloudflare (with edge-runtime caveats), Render, etc. The service-role key must be a secret env var.

## Common issues

| Symptom | Fix |
|---|---|
| `Invalid token: The specified alg value is not allowed` | Old code locked to HS256 but your Supabase project uses ES256. The included `auth.ts` already handles both via JWKS — make sure you didn't downgrade it. |
| `401 Missing bearer token` | Add `Authorization: Bearer <token>` header to your request. |
| Token verifies but `user.id` is empty | Wrong audience — Supabase tokens have `aud: "authenticated"`. |
