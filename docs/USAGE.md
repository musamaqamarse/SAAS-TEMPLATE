# Using the SAAS Template

End-to-end walkthrough of scaffolding, customizing, and extending.

## 1. Install once

```bash
pnpm install
pnpm build
```

This compiles the CLI to `dist/`. From then on you can run it via:

```bash
pnpm create my-cool-app    # uses tsx — runs from src/, no rebuild needed
# OR after `pnpm build`:
node dist/index.js my-cool-app
```

If you want it on your `PATH` system-wide:

```bash
pnpm link --global         # exposes `create-saas` globally
create-saas my-cool-app
```

## 2. Scaffold a new project

```bash
pnpm create my-cool-app
```

You'll be asked:

| Prompt | What it does |
|---|---|
| Project name | The display name. Used to derive `__PROJECT_KEBAB__`, `__PROJECT_SNAKE__`, etc. |
| Description | Goes into READMEs and metadata |
| Data stack | Picks Supabase or Firebase. Drives both client SDKs and infra layout. |
| Backend | FastAPI / Next.js API / none |
| Website | Next.js / React+Vite / none |
| Admin panel | Next.js admin shell |
| Mobile | Flutter app with Riverpod + go_router |
| Bundle ID prefix | e.g. `com.yourname` → mobile bundle becomes `com.yourname.mycoolapp` |
| Init git | `git init` per subfolder + initial commit |
| Create GitHub repos | Uses `gh` CLI if available |

Result:

```
my-cool-app/
├── my-cool-app-backend/
├── my-cool-app-website/
├── my-cool-app-adminpanel/
├── my-cool-app-mobileapp/
└── my-cool-app-infra/
```

## 3. Per-app first steps

Each subfolder has its own README with setup. Quick reference:

### Backend (FastAPI)
```bash
cd my-cool-app-backend
uv venv && uv pip install -e ".[dev]"
cp .env.example .env  # fill in keys
uvicorn app.main:app --reload --port 8000
```

### Backend (Next.js API)
```bash
cd my-cool-app-backend
pnpm install
cp .env.example .env.local  # fill in keys
pnpm dev   # http://localhost:8000
```

### Website (Next.js or React+Vite)
```bash
cd my-cool-app-website
pnpm install
cp .env.example .env.local  # fill in keys
pnpm dev
```

### Admin panel
```bash
cd my-cool-app-adminpanel
pnpm install
cp .env.example .env.local
pnpm dev   # http://localhost:3001
```

### Mobile (Flutter)
```bash
cd my-cool-app-mobileapp

# Generate native iOS/Android folders if not already done.
# Replace `--org` with your bundle prefix.
flutter create --org com.yourname --project-name my_cool_app .

flutter pub get
cp .env.example .env
flutter run
```

For the **Firebase** variant, also run:
```bash
dart pub global activate flutterfire_cli
flutterfire configure
```
That generates `firebase_options.dart` — uncomment its import in `lib/main.dart`.

### Infra (Supabase)
```bash
cd my-cool-app-infra
supabase login
supabase link --project-ref <ref>
supabase db push
```

### Infra (Firebase)
```bash
cd my-cool-app-infra
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## 4. Adding a new template

Templates are plain folders under `templates/`. To add `templates/website-svelte/`:

1. Create `templates/website-svelte/_template.json`:
   ```json
   {
     "name": "website-svelte",
     "role": "website",
     "displayName": "Svelte Website",
     "language": "typescript",
     "supports": ["supabase", "firebase"],
     "folderSuffix": "website"
   }
   ```
2. Add `_common/`, `_supabase/`, and `_firebase/` directories with all the files.
3. Update [src/scaffold.ts](../src/scaffold.ts)`planApps()` and [src/prompts.ts](../src/prompts.ts) to expose the new option.
4. Done. The placeholder engine and overlay logic just work.

## 5. Adding a new placeholder

Edit [src/placeholders.ts](../src/placeholders.ts) and [src/utils.ts](../src/utils.ts) — for example, to support `__VENDOR__`:

```ts
// utils.ts: derive from prompts (already wired)
// placeholders.ts:
return [
  ...,
  [/__VENDOR__/g, cfg.vendor ?? "Acme"],
];
```

Then use `__VENDOR__` anywhere in a template (filenames or contents).

## 6. Things you'll want to do after first scaffold

- **Stripe / billing** — wire up webhooks into your backend; the `subscriptions` schema is already there.
- **Email transactional** — Postmark / Resend; add to backend.
- **Analytics** — PostHog / Plausible drop into the website with one env var.
- **Tighten admin guard** — by default any signed-in user can access `/admin`. Add a custom claim or admins table check (see comments in `lib/admin-guard.*`).
- **Production auth confirmation** — Supabase: set `enable_confirmations = true` in `config.toml`. Firebase: enable email verification in console.
- **Deploy targets**:
  - Backend (FastAPI) — Render, Fly, Railway, Cloud Run
  - Backend (Next.js API) — Vercel, Cloudflare Pages
  - Website / admin — Vercel, Netlify, Cloudflare Pages
  - Mobile — EAS Build (Expo) doesn't apply; use `flutter build apk` / `xcodebuild` or Codemagic / Bitrise

## 7. Troubleshooting

**`No apps selected — nothing to do.`**
You said no to every component. Re-run and pick at least one.

**`Template <name> does not support <stack>`**
The template's `_template.json` doesn't list your data stack in `supports`. Either pick a different stack or extend the template with that variant.

**`Destination ... already exists and is not empty`**
The CLI refuses to overwrite. Pick a different name or remove the folder.

**Placeholders not replaced in a binary file**
The CLI only replaces in known text extensions ([src/placeholders.ts](../src/placeholders.ts)`TEXT_EXTENSIONS`). Add the extension if you have a custom text format.
