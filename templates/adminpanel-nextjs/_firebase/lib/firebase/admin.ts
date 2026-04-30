import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";

function ensureApp() {
  if (getApps().length > 0) return;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credentialOpt =
    credPath && fs.existsSync(credPath)
      ? cert(JSON.parse(fs.readFileSync(credPath, "utf8")))
      : applicationDefault();
  initializeApp({ credential: credentialOpt, projectId: process.env.FIREBASE_PROJECT_ID });
}

export function adminAuth() { ensureApp(); return getAuth(); }
export function adminDb() { ensureApp(); return getFirestore(); }
