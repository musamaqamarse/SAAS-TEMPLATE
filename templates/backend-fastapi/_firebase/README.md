# __PROJECT_NAME__ — Backend (FastAPI + Firebase)

> __DESCRIPTION__

FastAPI backend wired to Firebase Admin SDK. ID-token verification on every protected route via `verify_id_token()`.

**Time to first authenticated request:** ~5 minutes.

## What's pre-wired

- `require_user()` dependency that verifies Firebase ID tokens on every protected route
- Lazy Firebase Admin SDK initialization
- Pydantic-settings for typed env config
- CORS configured for the local dev ports of every other app in the scaffold
- Health + user endpoints + auto-generated OpenAPI docs at `/docs`

## Prerequisites

- Python 3.12+
- A Firebase project ([create one](https://console.firebase.google.com))

## 1 — Set up Firebase

### Create a project
Firebase Console → **Add project**.

### Enable services
- **Authentication** → enable sign-in methods
- **Firestore Database** → Create → test mode → pick region
- **Storage** → Get started (optional)

### Generate a service account
**Project Settings → Service accounts → Generate new private key** → save as `service-account.json` in the project root.

Already in `.gitignore`. Never commit it.

## 2 — Wire env vars

```bash
cp .env.example .env
```

| Variable | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | your project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | `./service-account.json` |
| `APP_NAME` | display name |
| `APP_ENV` | `development` / `production` |
| `CORS_ORIGINS` | comma-separated list |

## 3 — Install + run

```bash
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload --port 8000
```

OpenAPI docs at http://localhost:8000/docs.

## Endpoints

| Method | Path | Auth | Returns |
|---|---|---|---|
| `GET` | `/` | none | App info |
| `GET` | `/health` | none | `{ status: "ok" }` |
| `GET` | `/users/me` | Bearer | User uid + email + claims |

### Calling from the terminal

```bash
# Mint a token via the Identity Toolkit REST API:
curl -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$WEB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"u@example.com","password":"...","returnSecureToken":true}'
# Then call:
curl http://localhost:8000/users/me -H "Authorization: Bearer <id_token>"
```

`$WEB_API_KEY` is the `apiKey` field from your Web app config in Firebase Console.

## Deploying

**Cloud Run is the cleanest fit** — Application Default Credentials kicks in automatically using the runtime service account, so you can **omit** `GOOGLE_APPLICATION_CREDENTIALS` in that environment.

Other targets: Render, Fly, Railway, Docker on a VPS — mount the service-account JSON as a secret file or base64 it into an env var and decode at startup.

## Common issues

| Symptom | Fix |
|---|---|
| `The default Firebase app does not exist` | `firebase_admin.initialize_app()` wasn't called. The included `app/core/db.py:ensure_firebase_initialized()` handles it — make sure auth.py calls it before `verify_id_token`. |
| `Could not load the default credentials` | Wrong path in `GOOGLE_APPLICATION_CREDENTIALS` or running outside ADC. |
| 401 with a valid-looking token | Token is from a different Firebase project. Check `FIREBASE_PROJECT_ID` matches the one your client uses. |
