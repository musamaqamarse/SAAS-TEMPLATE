# __PROJECT_NAME__ — Website (React + Vite + Supabase)

> __DESCRIPTION__

Vite + React SPA wired to Supabase for auth and database. Faster dev loop than Next.js (HMR is instant), no SSR complexity, deploys as static files anywhere.

**Time to first signed-in user:** ~10 minutes.

## What's pre-wired

- Email/password sign-up + login
- **Google OAuth** with the full callback flow (`/auth/callback` route)
- Browser-side Supabase client singleton
- Logout that clears the session
- Tailwind + small UI primitives
- TypeScript strict mode + `vite/client` types so `import.meta.env.VITE_*` is typed

## Prerequisites

- Node.js 20+
- A Supabase project ([create one for free](https://supabase.com/dashboard))

## 1 — Set up Supabase

### Create a project
Supabase Dashboard → **New project** → pick region close to your users.

### Enable Google OAuth
1. https://console.cloud.google.com/apis/credentials → **Create Credentials → OAuth Client ID** → Web application
2. Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Copy Client ID + Secret
4. Supabase → **Authentication → Providers → Google** → Enable, paste credentials, save
5. Supabase → **Authentication → URL Configuration → Redirect URLs** → add `http://localhost:5173/auth/callback` and your prod URL

## 2 — Wire env vars

```bash
cp .env.example .env.local
```

Vite only exposes vars prefixed with `VITE_` to the browser:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |

## 3 — Install + run

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Project structure

```
src/
├── pages/
│   ├── Login.tsx       Email + Google login
│   ├── Signup.tsx
│   ├── Dashboard.tsx   Authenticated page (with logout)
│   └── AuthCallback.tsx OAuth redirect handler
├── lib/supabase.ts     Browser client singleton
├── App.tsx             Routes
└── main.tsx
```

## Deploying

Static SPA — deploy to Netlify, Vercel, Cloudflare Pages, S3+CloudFront, GitHub Pages, etc. Set the two env vars in your hosting provider, and add your production URL to Supabase → Authentication → URL Configuration → Redirect URLs.

## Common issues

| Symptom | Fix |
|---|---|
| `import.meta.env` is `undefined` in TypeScript | `tsconfig.json` needs `"types": ["vite/client"]` under compilerOptions. |
| Google login redirects to home with no session | Check the redirect URL is whitelisted in Supabase, and the `AuthCallback.tsx` route is mounted at `/auth/callback`. |
| `VITE_*` env vars undefined at runtime | Restart the dev server after editing `.env.local` — Vite reads env at start. |
