# __PROJECT_NAME__ — Admin Panel (Next.js + Supabase)

> __DESCRIPTION__

A Next.js admin panel wired to Supabase. Server-side admin guard runs in a Server Component, so unauthorized users are redirected before any HTML is rendered — no client-side flash.

**Time to first admin login:** ~10 minutes.

## What's pre-wired

- Email + Google sign-in
- **Server-side `requireAdmin()`** that runs before render — no flicker, no client redirects
- Sidebar shell with logout button (Overview / Users / Settings)
- Cookie-based sessions via `@supabase/ssr`
- TypeScript strict mode + Tailwind

## Prerequisites

- Node.js 20+
- A Supabase project ([create one](https://supabase.com/dashboard))

## 1 — Set up Supabase

### Create a project
Supabase Dashboard → **New project** → pick region.

### Enable Google OAuth
1. https://console.cloud.google.com/apis/credentials → **OAuth Client ID** → Web application
2. Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → Providers → Google** → Enable, paste credentials
4. Supabase → **URL Configuration → Redirect URLs** → add `http://localhost:3001/auth/callback` and your prod URL

### Tighten admin access (recommended before production)
The default `requireAdmin()` lets any signed-in user reach the admin panel — fine for early dev, **not for production**. Pick one:

- **Custom claim:** add `app_metadata.role: "admin"` to specific users via the Supabase dashboard or admin API, then check `user.app_metadata?.role === "admin"`
- **Admin table:** create an `admins` table keyed by `user_id` and join from `requireAdmin()`
- **Email allowlist:** check `user.email` against a hardcoded list (small teams only)

Edit `lib/admin-guard.ts` to enforce whichever you pick.

## 2 — Wire env vars

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key (**server-side only**) |

> **Critical:** the service-role key bypasses RLS. Never expose it to the browser. It's used only in server components / route handlers for admin actions.

## 3 — Install + run

```bash
npm install
npm run dev -- --port 3001
```

Open http://localhost:3001 → log in → you'll land on `/admin`.

## Project structure

```
app/
├── login/                  Email + Google login
├── auth/callback/          OAuth callback
├── admin/
│   ├── layout.tsx          requireAdmin() runs here (server component)
│   ├── page.tsx            Overview
│   ├── users/page.tsx
│   └── settings/page.tsx
├── layout.tsx
components/
├── Shell.tsx               Sidebar + content layout
├── LogoutButton.tsx        Client component, signs out via Supabase
└── ui.tsx
lib/
├── supabase/client.ts      Browser client
├── supabase/server.ts      SSR cookie-aware client
└── admin-guard.ts          requireAdmin() — edit to tighten
```

## Deploying

Vercel (best fit), Netlify, Render, Fly, etc. Set all 3 env vars in your provider; the service-role key must be marked as a **secret/non-public** env variable.

Add your production URL to Supabase → Authentication → URL Configuration → Redirect URLs.

## Common issues

| Symptom | Fix |
|---|---|
| Anyone can reach `/admin` | You haven't tightened `requireAdmin()` yet — see the section above. |
| Service-role key leaks to the browser bundle | Never reference it from a `"use client"` file. Audit with `grep -r SERVICE_ROLE app/` — should only match server components / route handlers. |
| Logout button does nothing | LogoutButton needs `"use client"` and must use the browser client (`createClient()` from `lib/supabase/client.ts`). |
