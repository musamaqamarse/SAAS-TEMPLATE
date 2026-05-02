# @create-saas/docs

The reference docs site for `create-saas`. Plain Next.js + MDX + Tailwind — no docs framework. Fast to build, easy to extend.

## Local dev

```bash
pnpm --filter @create-saas/docs dev   # http://localhost:3030
```

## Pages

- `app/page.mdx` — Overview
- `app/quickstart/page.mdx` — Quickstart
- `app/reference/cli/page.mdx` — CLI flag reference
- `app/reference/scaffold-config/page.mdx` — ScaffoldConfig schema
- `app/reference/saas-config/page.mdx` — saas.config.json shape

Add a page by dropping a new `app/<route>/page.mdx`. Update the sidebar in `app/layout.tsx`.
