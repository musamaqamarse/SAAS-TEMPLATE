# __PROJECT_NAME__ — Admin Panel

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3001.

> **Authorization:** by default, any signed-in user can access `/admin`. Lock this down before going to production by checking a custom claim or membership in an `admins` table — see `lib/admin-guard.ts`.
