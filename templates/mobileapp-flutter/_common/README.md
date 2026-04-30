# __PROJECT_NAME__ — Mobile (Flutter)

__DESCRIPTION__

## Setup

```bash
flutter pub get
cp .env.example .env
# fill in keys, then:
flutter run
```

## Bundle ID

This template uses `__BUNDLE_ID__`. After scaffolding, complete the bundle-id wiring for both platforms (the Flutter project files need a one-time setup):

```bash
# Once, to generate native iOS/Android folders:
flutter create --org $(echo __BUNDLE_ID__ | sed 's/\.[^.]*$//') --project-name __PROJECT_SNAKE__ .
```

## State management

[Riverpod](https://riverpod.dev) — providers live in `lib/providers/`.

## Routing

[go_router](https://pub.dev/packages/go_router) — see `lib/app/router.dart`.

## Push notifications

The Firebase variant ships with FCM wired up; the Supabase variant uses Supabase realtime + your own push service (no built-in push). Add `firebase_messaging` if you want FCM with Supabase auth.
