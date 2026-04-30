# __PROJECT_NAME__ — Supabase infra

Migrations, RLS policies, and storage bucket bootstrap for __PROJECT_NAME__.

## Quick start

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development) and link to your project:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push           # apply migrations
supabase db reset --linked # OR: wipe and reapply (LOCAL/STAGING ONLY)
```

For local dev:
```bash
supabase start             # spins up local Supabase
supabase db reset          # apply migrations + seed
```

## Layout

```
.
├── config.toml          # Supabase CLI config
├── migrations/          # Versioned SQL — applied in name order
│   ├── 0001_init.sql        # profiles, RLS, triggers
│   ├── 0002_subscriptions.sql
│   ├── 0003_audit_log.sql
│   └── 0004_storage.sql     # bucket + policies
└── seed.sql             # Local seed data (not run in production)
```
