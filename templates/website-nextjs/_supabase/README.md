# __PROJECT_NAME__ — Website (Next.js + Supabase)

> __DESCRIPTION__

A Next.js 15 App Router website wired to Supabase for auth and database access. Email + Google login work out of the box, including the OAuth redirect dance most starters get wrong.

**Time to first signed-in user:** ~10 minutes.

## What's pre-wired

- Email/password sign-up + login
- **Google OAuth** with the full callback flow (`/auth/callback`)
- Cookie-based sessions via `@supabase/ssr` — server components can read the user
- Logout button on the dashboard
- Tailwind + a small set of UI primitives
- TypeScript strict mode, ESLint, no warnings on a clean clone

## Prerequisites

- Node.js 20+
- A Supabase project ([create one for free](https://supabase.com/dashboard))

## 1 — Set up Supabase

### Create a project
Supabase Dashboard → **New project** → pick region close to your users → save the database password somewhere safe.

### Enable auth providers

**Email/password** is on by default — nothing to do.

**Google OAuth:**
1. Go to https://console.cloud.google.com/apis/credentials → **Create Credentials → OAuth Client ID** → Web application
2. Add authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   *(your project ref is in Supabase → Project Settings → General)*
3. Copy the **Client ID** and **Client Secret**
4. Supabase → **Authentication → Providers → Google** → Enable, paste both values, save
5. Supabase → **Authentication → URL Configuration → Redirect URLs** → add `http://localhost:3000` and your production domain

## 2 — Wire env vars

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |

## 3 — Install + run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

You should be able to sign up with email or Google, see the dashboard, and log out. If any of those don't work, jump to **Common issues** below.

## Project structure

```
app/
├── login/         Email + Google login page
├── signup/        Email signup page
├── dashboard/     Authenticated landing page (with logout button)
├── auth/callback/ OAuth callback route — Google redirects here
├── layout.tsx
└── page.tsx       Public landing page
components/        UI primitives (Button, Input, etc.)
lib/supabase/      Browser + server-side Supabase clients
```

## How auth works

- **Browser sessions** are stored in cookies via `@supabase/ssr` so server components can read the user without re-fetching from Supabase on every request.
- The `/auth/callback` route exchanges the OAuth code for a session and sets the cookies.
- The dashboard page uses `useAuth()` from `lib/supabase/auth-context.tsx` to access the current user.

## Deploying

Works on Vercel, Netlify, Cloudflare Pages, or any Node host. Two steps:
1. Set the two env vars in your hosting provider
2. Add your production URL to Supabase → Authentication → URL Configuration → Redirect URLs

## Common issues

| Symptom | Fix |
|---|---|
| `Invalid API key` | Wrong env var, or you're using the `service_role` key on the client. Use `anon` only on the browser. |
| Google login redirects to `/auth/callback?error=...` | The redirect URI in Google Cloud Console must exactly match `https://<ref>.supabase.co/auth/v1/callback` — no trailing slash. |
| Hydration warnings around `<a>` / `<Link>` | Don't nest `<a>` inside `<Link>`. Next.js 15 removed the wrapper auto-hoist. |
