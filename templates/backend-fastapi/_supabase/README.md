# __PROJECT_NAME__ — Backend (FastAPI + Supabase)

> __DESCRIPTION__

FastAPI backend wired to Supabase. JWT verification on every protected route via Supabase's JWKS endpoint — auto-detects HS256 (legacy projects) and ES256 (new projects). Single most common stumbling block when building a Supabase backend, handled.

**Time to first authenticated request:** ~5 minutes.

## What's pre-wired

- `require_user()` dependency that verifies the bearer token on every protected route
- **HS256 + ES256 auto-detection** via JWKS — legacy and new Supabase projects both work
- Pydantic-settings for typed env config
- CORS configured for the local dev ports of every other app in the scaffold
- Health + user endpoints + auto-generated OpenAPI docs at `/docs`

## Prerequisites

- Python 3.12+
- A Supabase project ([create one](https://supabase.com/dashboard))

## 1 — Set up Supabase

Supabase Dashboard → **New project** → pick region.

## 2 — Wire env vars

```bash
cp .env.example .env
```

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key (**KEEP SECRET**) |
| `SUPABASE_JWT_SECRET` | Supabase → Project Settings → API → JWT Secret (only for legacy HS256 projects) |
| `APP_NAME` | display name |
| `APP_ENV` | `development` / `production` |
| `CORS_ORIGINS` | comma-separated list of allowed origins |

> For new Supabase projects (which use ES256 JWTs), `SUPABASE_JWT_SECRET` is unused — verification happens via JWKS.

## 3 — Install + run

```bash
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload --port 8000
```

Or with a virtualenv:

```bash
python -m venv .venv
. .venv/bin/activate                 # Linux/macOS
# .venv\Scripts\activate.bat         # Windows
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload --port 8000
```

OpenAPI docs at http://localhost:8000/docs.

## Endpoints

| Method | Path | Auth | Returns |
|---|---|---|---|
| `GET` | `/` | none | App info |
| `GET` | `/health` | none | `{ status: "ok" }` |
| `GET` | `/users/me` | Bearer | User decoded from JWT |

### Calling from the terminal

```bash
# 1. Sign in via the auth REST API to get a token:
curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"u@example.com","password":"..."}'
# 2. Call protected endpoint:
curl http://localhost:8000/users/me -H "Authorization: Bearer <access_token>"
```

## Deploying

Render, Fly.io, Railway, Cloud Run, AWS App Runner, Docker on a VPS — all work fine. Service-role key must be a secret env var.

## Common issues

| Symptom | Fix |
|---|---|
| `Invalid token: The specified alg value is not allowed` | Old code locked to HS256 but your Supabase project uses ES256. The included `auth.py` auto-detects from the JWT header — keep it as shipped. |
| `SUPABASE_URL is not configured` when calling `/users/me` | `.env` not loaded. Check the working directory when starting uvicorn. |
| `pip install` fails with Python 3.11 | This package requires 3.12+. Run with `python3` (or `python3.12`) explicitly. |
