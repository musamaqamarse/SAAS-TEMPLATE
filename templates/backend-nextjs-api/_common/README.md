# __PROJECT_NAME__ — Backend (Next.js API)

__DESCRIPTION__

A headless Next.js app exposing only API routes — no UI.

## Setup

```bash
pnpm install
cp .env.example .env.local
# fill in keys
pnpm dev
```

API is served at `http://localhost:8000`.

## Endpoints

- `GET /api/health` — liveness probe
- `GET /api/users/me` — current user (requires `Authorization: Bearer <token>`)
- `POST /api/storage/upload` — multipart upload (requires auth)

## Deploy

Vercel works out of the box. For Cloudflare, Render, Fly, etc., follow the standard Next.js standalone deploy.
