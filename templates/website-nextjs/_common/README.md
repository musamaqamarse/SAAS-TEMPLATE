# __PROJECT_NAME__ — Website (Next.js)

__DESCRIPTION__

## Setup

```bash
pnpm install
cp .env.example .env.local
# fill in keys
pnpm dev
```

Open http://localhost:3000.

## Structure

```
app/
├── (marketing)/      # Public landing pages
├── (auth)/           # Login, signup
├── (app)/            # Authenticated app — dashboard, account
├── layout.tsx
└── globals.css
components/           # Shared UI primitives
lib/                  # Auth + DB clients
```
