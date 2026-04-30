# __PROJECT_NAME__ — Website (Next.js + Firebase)

> __DESCRIPTION__

A Next.js 15 App Router website wired to Firebase for auth, Firestore, and FCM web push. Email + Google login work out of the box, and push notifications actually display when the tab is open (foreground messages) without you wiring up `flutter_local_notifications`-equivalent yourself.

**Time to first signed-in user:** ~15 minutes.

## What's pre-wired

- Email/password sign-up + login
- **Google OAuth** (popup, with redirect fallback if popups are blocked)
- Cookie-aware client + server Firebase setup
- **FCM web push** — service worker served dynamically from a Next.js API route so it can read env vars at request time (browsers can't read `process.env` inside SWs)
- Foreground message handler that displays notifications in-page as a banner
- Logout button on the dashboard
- Tailwind + UI primitives
- TypeScript strict mode

## Prerequisites

- Node.js 20+
- A Firebase project ([create one](https://console.firebase.google.com))

## 1 — Set up Firebase

### Create a project
Firebase Console → **Add project** → name it → continue (Google Analytics is optional).

### Register a Web app
1. Project Settings → **Your apps** → click `</>` (Web)
2. Register app (Hosting setup is optional at this stage)
3. Copy the `firebaseConfig` object — you'll need 6 values for `.env.local`

### Enable auth providers
1. **Authentication → Get started**
2. **Sign-in method → Email/Password** → Enable
3. **Sign-in method → Google** → Enable, set support email, save
4. **Settings → Authorized domains** — `localhost` is auto-added; add your prod domain when you deploy

### Create Firestore database
**Firestore Database → Create database** → start in **test mode** (tighten rules before production) → pick a region.

### Set up FCM web push
1. **Project Settings → Cloud Messaging tab**
2. Under **Web Push certificates** → **Generate key pair** → copy the key
3. **Critical:** enable the Cloud Messaging API in Google Cloud Console:
   `https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=<your-project-id>`
   Without this, `getToken()` fails with `AbortError: Registration failed - push service error` — a confusing error that has nothing to do with your code.

## 2 — Wire env vars

```bash
cp .env.example .env.local
```

Fill in from Firebase Console → Project Settings → Your apps → Web app config:

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Cloud Messaging tab → Web Push certificates |

## 3 — Install + run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

You should be able to sign up, log in (email + Google), and reach the dashboard. After landing on `/dashboard` the browser will ask permission to show notifications — allow it to get an FCM token. Send a test notification from Firebase Console → Cloud Messaging → New campaign → Test message → paste the token.

## Project structure

```
app/
├── login/                  Email + Google login
├── signup/                 Email signup
├── dashboard/              Authenticated dashboard, FCM token display
├── api/firebase-sw/        Service worker route (injects Firebase config server-side)
├── layout.tsx
└── page.tsx                Public landing page
components/                 UI primitives
lib/firebase/
├── client.ts               Browser Firebase init (singleton)
├── auth-context.tsx        React context exposing the current user
└── push.ts                 FCM token + foreground message helpers
```

## How push works

- The service worker is served dynamically from `/api/firebase-sw` (so it can read `NEXT_PUBLIC_*` env vars at request time — service workers can't read `process.env` directly)
- `initPushAndGetToken(vapidKey)` requests permission, registers the SW, and returns the device token
- `onForegroundMessage(callback)` fires when an FCM message arrives while the tab is open — the dashboard wires this to show an in-page banner

To send to a token: Firebase Console → Cloud Messaging → New campaign → Test message → paste token.

## Deploying

Works on Vercel, Netlify, Firebase Hosting (with Next.js framework experimental), Cloudflare Pages, or any Node host. Set all 7 env vars in your hosting provider and add your production domain to Firebase → Authentication → Settings → Authorized domains.

## Common issues

| Symptom | Fix |
|---|---|
| `AbortError: Registration failed - push service error` | The Cloud Messaging API isn't enabled in Google Cloud. Open the URL above and click Enable. |
| Google sign-in popup closes immediately | Your domain isn't in Authorized domains, or third-party cookies are blocked. The template falls back to redirect mode in that case. |
| Service worker stale after env change | DevTools → Application → Service Workers → Unregister, then hard reload. |
| `auth/invalid-api-key` | Env file is `.env` instead of `.env.local`, or the dev server wasn't restarted after editing. |
