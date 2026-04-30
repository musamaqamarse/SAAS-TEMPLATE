# __PROJECT_NAME__ — Backend (Next.js API + Firebase)

> __DESCRIPTION__

Next.js API routes wired to the Firebase Admin SDK. Firebase ID-token verification on every protected route via `verify_id_token()`.

**Time to first authenticated request:** ~5 minutes.

## What's pre-wired

- `requireUser()` middleware that verifies Firebase ID tokens on every protected route
- Firebase Admin SDK initialization with lazy singleton
- CORS configured for the local dev ports of every other app in the scaffold
- Health + user endpoints out of the box

## Prerequisites

- Node.js 20+
- A Firebase project ([create one](https://console.firebase.google.com))

## 1 — Set up Firebase

### Create a project
Firebase Console → **Add project** → name it.

### Enable services
- **Authentication** → enable any sign-in methods you need
- **Firestore Database** → Create database → test mode → pick region
- **Storage** → Get started (optional)

### Generate a service account
**Project Settings → Service accounts → Generate new private key** → save as `service-account.json` in the project root.

Already in `.gitignore`. Never commit it.

## 2 — Wire env vars

```bash
cp .env.example .env.local
```

| Variable | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | your project ID |
| `FIREBASE_STORAGE_BUCKET` | `<project-id>.firebasestorage.app` |
| `GOOGLE_APPLICATION_CREDENTIALS` | `./service-account.json` |

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
| `GET` | `/api/users/me` | Bearer | Caller's claims |

### Calling from a frontend

```js
const token = await firebase.auth().currentUser.getIdToken();
const r = await fetch("/api/users/me", {
  headers: { Authorization: `Bearer ${token}` }
});
```

## Deploying

**Cloud Run is the cleanest fit** — Application Default Credentials kicks in automatically using the runtime service account, so you can **omit** `GOOGLE_APPLICATION_CREDENTIALS` in that environment.

Other targets: Vercel, Netlify, Render, Fly. On platforms that support file mounts, mount the service-account JSON as a secret file. On others, base64-encode it into a single env var and decode at startup.

## Common issues

| Symptom | Fix |
|---|---|
| `The default Firebase app does not exist` | `firebase-admin` wasn't initialized before use. Call `ensureFirebaseInitialized()` first. |
| `Could not load the default credentials` | `GOOGLE_APPLICATION_CREDENTIALS` points to a missing file or you're running on a host without ADC. |
| 401s with a valid token | Token is from a different Firebase project. Check `FIREBASE_PROJECT_ID` matches the one your client uses. |
