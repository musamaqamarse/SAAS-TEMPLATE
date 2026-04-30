# __PROJECT_NAME__ — Firebase infra

Firestore rules, indexes, storage rules, and a Cloud Functions skeleton for __PROJECT_NAME__.

## Quick start

Install the Firebase CLI and log in:

```bash
npm i -g firebase-tools
firebase login
firebase use --add        # link to your project (creates .firebaserc)
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Layout

```
.
├── firebase.json
├── .firebaserc                  # written by `firebase use --add`
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
└── functions/                   # Cloud Functions (TypeScript)
    ├── package.json
    ├── tsconfig.json
    └── src/index.ts
```

## Local emulators

```bash
firebase emulators:start
```
