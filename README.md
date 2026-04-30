# create-saas

> Scaffold a production-ready SaaS — backend, website, admin panel, mobile app, and infra — wired to **Supabase** or **Firebase**, in under a minute.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Node 20+](https://img.shields.io/badge/Node-20%2B-brightgreen)
![Status](https://img.shields.io/badge/status-stable-blue)

Most SaaS boilerplates lock you into one stack and one shape. This one doesn't. Pick your apps, pick Supabase or Firebase, run one command, and you walk away with a working multi-app project where every piece is independently deployable and already wired up — auth flows, JWT verification, push notifications, admin guards, OAuth callbacks, the boring stuff that takes a week the first time.

```bash
pnpm dev my-cool-app
# follow the prompts — pick stack, pick apps — done.
```

---

## What you walk away with

Run the CLI for `my-cool-app` with everything selected, pick **Supabase**, and the output is:

```
my-cool-app/
├── my-cool-app-backend/        FastAPI (Python 3.12) — JWT verified via JWKS
├── my-cool-app-website/        Next.js 15 — App Router, Tailwind, email + Google login
├── my-cool-app-adminpanel/     Next.js — server-side admin guard, sidebar shell
├── my-cool-app-mobileapp/      Flutter — Riverpod, go_router, FCM (foreground+background+killed)
└── my-cool-app-infra/          Supabase migrations + seed
```

Each subfolder:
- Is its own **independent git repo** (with initial commit)
- Has its own **detailed README** with setup steps for the chosen stack
- Is **deployable on day one** to Vercel / Render / Cloud Run / Play Store / App Store
- Shares **zero monorepo glue** with its siblings — talks via HTTP + tokens

Same command with **Firebase** swaps the SDKs, auth flow, JWT verifier, and infra to Firestore + Firebase Auth + Firebase Storage. No code re-arrangement on your end.

---

## Why this exists

Wiring a SaaS from scratch always means the same week of grunt work:

- Supabase or Firebase project setup
- Email + Google OAuth flows that actually round-trip correctly
- Backend JWT verification (and remembering which Supabase projects use HS256 vs ES256)
- A push-notification pipeline that works in foreground, background, *and* killed states on real devices
- An admin panel that doesn't just check `if (user)` and call it a day
- An infra folder so the database isn't living in someone's untracked browser tab

This CLI is the answer to "I never want to do this from scratch again." Pick your stack, get a starting point that handles the gnarly parts, then write the actual product.

---

## Quick start

```bash
git clone https://github.com/<your-fork>/create-saas.git
cd create-saas
pnpm install
pnpm dev my-cool-app
```

The CLI walks you through:

| Step | Choice |
|---|---|
| Project name | `My Cool App` (kebab/snake/Pascal/bundle-id are derived automatically) |
| Apps to include | Backend · Website · Admin panel · Mobile — any combination |
| Backend flavor | FastAPI · Next.js API routes |
| Website flavor | Next.js (App Router) · React + Vite (SPA) |
| Data stack | **Supabase** · **Firebase** — applied uniformly across the project |
| Init git? | yes/no per subfolder |
| Create GitHub repos? | uses `gh` CLI if available |

When it finishes you'll see one README path per app — open them in order, fill in env vars, and you're running.

---

## What's pre-wired in every variant

Things you don't have to build:

**Auth**
- Email/password sign-up + login
- Google OAuth (web: redirect flow with callback handling · mobile: native + SHA-1 instructions)
- Logout that actually clears the session and redirects
- Auth context / hooks — consumed by the dashboard out of the box

**Backend**
- JWT verification on every protected route
- Supabase auto-detects HS256 (legacy projects) and ES256 (new projects) via JWKS
- Firebase uses `firebase_admin.auth.verify_id_token()`
- CORS configured for the local dev ports of every other app in the scaffold

**Mobile push (FCM)**
- Token retrieval + permission flow
- Channel + foreground display via `flutter_local_notifications` — notifications actually appear when the app is open
- Background + killed handlers wired
- Core library desugaring + Gradle config pre-set so the build doesn't surprise you

**Web push (Firebase variant)**
- Service worker served from a Next.js API route — so it can read `NEXT_PUBLIC_*` env vars at request time (browsers can't read `process.env` inside a service worker)

**Admin panel**
- Server-side guard for the Supabase variant (redirects before render)
- Client-side guard for the Firebase variant (`useRequireAdmin()`)
- Sidebar shell with logout, ready to drop more pages into

**Infra**
- Supabase: `supabase init` skeleton + migrations folder + seed
- Firebase: `firebase.json`, `firestore.rules`, `storage.rules`

---

## Choosing Supabase vs Firebase

| You probably want… | Pick |
|---|---|
| Postgres with full SQL | **Supabase** |
| Self-hostable open-source backend | **Supabase** |
| Row-level security policies | **Supabase** |
| Document/hierarchical data, fast | **Firebase** |
| Tightest mobile SDK + Crashlytics + Analytics | **Firebase** |
| Easiest mobile push setup | Either (Supabase variant uses Firebase only for FCM) |
| The team already knows one of them | Don't overthink it |

You commit to one stack per scaffold — no mix-and-match within one project. If you want to swap later, the per-app code is independent enough that re-scaffolding a single app on the other stack and copying your business logic over is reasonable.

---

## Common configurations

### Full SaaS — web + admin + mobile
```
backend (FastAPI) + website (Next.js) + adminpanel (Next.js) + mobile (Flutter) + Supabase
```
Most popular pick. User-facing site, internal admin, native mobile, one Postgres backing all three.

### Web-only SaaS, no mobile
```
backend (Next.js API) + website (Next.js) + Firebase
```
Single Next.js codebase deployable to Vercel; Firebase handles auth + Firestore. Smallest possible operational footprint.

### Mobile-first product
```
backend (FastAPI) + mobile (Flutter) + Firebase
```
Flutter app + a thin FastAPI for server-side logic. FCM works on day one across all 3 push states.

### Internal tool / admin dashboard
```
backend (Next.js API) + adminpanel (Next.js) + Supabase
```
Skip the public website. Two folders to maintain instead of four.

### Just kicking the tires
```bash
pnpm dev test-app
# pick all defaults — explore the output — `rm -rf test-app` when done
```

---

## How it works

```
.
├── src/                 The CLI (TypeScript)
│   ├── index.ts         Entry point
│   ├── prompts.ts       Interactive prompts
│   ├── scaffold.ts      Orchestrates copying + flutter create + git init
│   ├── placeholders.ts  Substitutes __PROJECT_NAME__ etc. in files + filenames
│   └── ...
├── templates/           Per-app templates
│   ├── backend-fastapi/
│   ├── backend-nextjs-api/
│   ├── website-nextjs/
│   ├── website-reactjs/
│   ├── adminpanel-nextjs/
│   └── mobileapp-flutter/
├── infra/               Supabase + Firebase IaC starters
└── docs/USAGE.md        End-to-end walkthrough
```

### Template overlay system

Every template uses an overlay system that keeps stack differences obvious:

```
templates/<role>/
├── _common/         Files shared by both stacks
├── _supabase/       Supabase-specific files (overlays on _common)
└── _firebase/       Firebase-specific files (overlays on _common)
```

Scaffold order:
1. `_common/` is copied into the destination
2. The chosen variant (`_supabase/` OR `_firebase/`) is copied on top, overwriting any conflicts
3. Placeholder strings are substituted in both file contents and file names

This means you can `diff -r templates/<role>/_supabase templates/<role>/_firebase` to see exactly what changes between stacks for that app — no hidden code-gen, no magic.

### Placeholders

Replaced everywhere in scaffolded files (text + filenames):

| Placeholder | Example | Used in |
|---|---|---|
| `__PROJECT_NAME__` | `My Cool App` | Display strings, page titles |
| `__PROJECT_KEBAB__` | `my-cool-app` | Folder names, package names |
| `__PROJECT_SNAKE__` | `my_cool_app` | Python modules, Flutter package |
| `__PROJECT_PASCAL__` | `MyCoolApp` | Class names |
| `__BUNDLE_ID__` | `com.you.mycoolapp` | iOS/Android bundle ID |
| `__DESCRIPTION__` | One-line description | README + `package.json` |

---

## Customizing & extending

Forking this repo is the intended path — the CLI is small (~500 lines of TypeScript) and the templates are the actual work.

**Add a new template variant:**
1. Open `templates/<role>/_common/` — make changes shared by both stacks here
2. Stack-specific bits go in `_supabase/` or `_firebase/` (mirrors the path layout under `_common`)
3. Use placeholder strings (`__PROJECT_NAME__` etc.)
4. Add a `README.md` to the variant folder so end-users get setup instructions

The CLI auto-discovers templates — no registration step.

**Swap a default:** the prompts live in `src/prompts.ts` — edit the `initial` values to change defaults.

**Add a new placeholder:** edit `src/placeholders.ts:buildReplacements()`.

---

## Requirements

- **Node.js 20+** (CLI runtime)
- **pnpm** (or npm — the scripts work either way)
- **Flutter 3.24+** if scaffolding mobile (the CLI calls `flutter create` to generate native folders)
- **Firebase CLI** signed in if you want auto SHA-1 registration / web app creation
- **GitHub CLI** (`gh`) signed in if you want auto repo creation
- **FlutterFire CLI** (`dart pub global activate flutterfire_cli`) for mobile Firebase setup

The CLI gracefully degrades if anything's missing — it skips the corresponding step and tells you what to run manually.

---

## Conventions

- **One stack per project.** A scaffold is fully Supabase or fully Firebase. No mixing within one project.
- **Independent repos.** Every scaffolded subfolder is its own git repo, deployable on its own.
- **No monorepo glue.** No shared `package.json` or workspace config across the apps. They share types via the wire (HTTP + auth tokens) only — keeps deployment simple.
- **Service-account / secret keys never committed.** The CLI adds them to `.gitignore` in every scaffolded backend.
- **Dev-mode defaults.** Templates ship with permissive Firestore rules, RLS off, CORS open. Each README points out where to tighten before production.

---

## Contributing

Bug reports and PRs welcome — especially:

- New template variants (Svelte? Solid? Hono backend?)
- Additional auth providers (GitHub, Apple, Microsoft)
- More infra targets (Cloudflare D1, Neon, PlanetScale)
- Documentation fixes

Open an issue first for substantial changes so we can discuss the shape.

---

## License

[MIT](LICENSE) — do whatever you want, just don't blame me when it breaks.

## See also

- [docs/USAGE.md](docs/USAGE.md) — full end-to-end walkthrough
- Each scaffolded app's `README.md` — stack-specific setup, env vars, deployment notes
