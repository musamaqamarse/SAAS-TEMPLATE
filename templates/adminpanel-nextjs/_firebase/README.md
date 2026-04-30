# __PROJECT_NAME__ — Admin Panel (Next.js + Firebase)

> __DESCRIPTION__

A Next.js admin panel wired to Firebase Auth. Client-side admin guard via `useRequireAdmin()` redirects unauthorized users on mount.

**Time to first admin login:** ~10 minutes.

## What's pre-wired

- Email + Google sign-in
- **`useRequireAdmin()`** hook that redirects on mount if no session
- Sidebar shell with logout button (Overview / Users / Settings)
- Tailwind + UI primitives
- TypeScript strict mode

## Prerequisites

- Node.js 20+
- A Firebase project ([create one](https://console.firebase.google.com))

## 1 — Set up Firebase

### Create a project
Firebase Console → **Add project** → name it.

### Register a Web app
Project Settings → **Your apps** → click `</>` → register app → copy `firebaseConfig`.

### Enable auth providers
**Authentication → Sign-in method:**
- **Email/Password** → Enable
- **Google** → Enable, set support email, save

### Service account (for server-side operations)
**Project Settings → Service accounts → Generate new private key** → save as `service-account.json` in the project root.

Already in `.gitignore`. Never commit it.

### Tighten admin access (recommended before production)
The default `useRequireAdmin()` lets any signed-in user in. Pick one:

- **Custom claim:** set via Firebase Admin SDK (`admin.auth().setCustomUserClaims(uid, { admin: true })`), then check `(await user.getIdTokenResult()).claims.admin`
- **Firestore lookup:** keep an `admins/{uid}` doc and check it
- **Email allowlist:** small teams only

Edit `lib/admin-guard.tsx` to enforce.

## 2 — Wire env vars

```bash
cp .env.example .env.local
```

Browser config (from Web app config):

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |

Server config (for API routes):

| Variable | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | your project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | `./service-account.json` |

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
├── admin/
│   ├── layout.tsx          "use client" — calls useRequireAdmin()
│   ├── page.tsx            Overview
│   ├── users/page.tsx
│   └── settings/page.tsx
├── layout.tsx
components/
├── Shell.tsx               Sidebar + content layout
├── LogoutButton.tsx        Client component, calls signOut(auth)
└── ui.tsx
lib/
├── firebase/client.ts      Initialized auth client
├── firebase/auth-context.tsx
└── admin-guard.tsx         useRequireAdmin() — edit to tighten
```

## Deploying

Vercel, Netlify, Render, Cloud Run, Firebase Hosting (with framework experimental). Set 6 public env vars + 2 server env vars. Upload the service-account JSON via secret/file mount on the platform — or use Application Default Credentials on GCP (Cloud Run picks it up automatically without `GOOGLE_APPLICATION_CREDENTIALS` set).

Add your production domain to Firebase → Authentication → Settings → Authorized domains.

## Common issues

| Symptom | Fix |
|---|---|
| Anyone can reach `/admin` | You haven't tightened `useRequireAdmin()` yet — see the section above. |
| Brief flash of admin content before redirect | Inherent to client-side guards. If you need zero-flash, port to a server-component check using a session cookie (Supabase variant of this template shows the pattern). |
| Logout doesn't redirect | LogoutButton needs to call `signOut(auth)` then `router.push('/login')` — both, in that order. |
