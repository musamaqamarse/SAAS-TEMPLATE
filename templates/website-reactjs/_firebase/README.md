# __PROJECT_NAME__ — Website (React + Vite + Firebase)

> __DESCRIPTION__

Vite + React SPA wired to Firebase for auth and Firestore. Faster dev loop than Next.js, no SSR complexity, deploys as static files anywhere.

**Time to first signed-in user:** ~10 minutes.

## What's pre-wired

- Email/password sign-up + login
- **Google OAuth** (popup + redirect fallback)
- Firebase singleton initialization
- Logout that clears the session
- Tailwind + small UI primitives
- TypeScript strict mode + `vite/client` types

## Prerequisites

- Node.js 20+
- A Firebase project ([create one](https://console.firebase.google.com))

## 1 — Set up Firebase

### Create a project
Firebase Console → **Add project** → name it.

### Register a Web app
1. Project Settings → **Your apps** → click `</>` (Web)
2. Register app → copy the `firebaseConfig` values

### Enable auth providers
1. **Authentication → Get started**
2. **Sign-in method → Email/Password** → Enable
3. **Sign-in method → Google** → Enable, set support email, save
4. **Settings → Authorized domains** — `localhost` is auto-added; add prod domain when deploying

### Create Firestore (optional but typical)
**Firestore Database → Create database** → start in **test mode** → pick region.

## 2 — Wire env vars

```bash
cp .env.example .env.local
```

Vite only exposes vars prefixed with `VITE_` to the browser. Fill in from Firebase Console → Project Settings → Your apps → Web app config:

| Variable | Source |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

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
│   └── Dashboard.tsx   Authenticated page (with logout)
├── lib/firebase.ts     Initialized Firebase app + auth
├── App.tsx
└── main.tsx
```

## Deploying

Static SPA — deploys to Firebase Hosting (best fit), Netlify, Vercel, Cloudflare Pages, etc. Set all 6 env vars in your hosting provider, and add your production domain to Firebase → Authentication → Settings → Authorized domains.

## Common issues

| Symptom | Fix |
|---|---|
| Google sign-in popup closes immediately | Domain isn't in Authorized domains, or third-party cookies are blocked. |
| `import.meta.env.VITE_*` undefined | Make sure your env file is `.env.local` (not `.env`) and you restarted the dev server after editing. |
| `auth/invalid-api-key` | Wrong API key or env var typo. |
