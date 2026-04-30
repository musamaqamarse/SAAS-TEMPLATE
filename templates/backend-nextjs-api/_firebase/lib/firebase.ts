import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";
import fs from "node:fs";

function ensureApp() {
  if (getApps().length > 0) return;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
  const credentialOpt =
    credPath && fs.existsSync(credPath)
      ? cert(JSON.parse(fs.readFileSync(credPath, "utf8")))
      : applicationDefault();
  initializeApp({ credential: credentialOpt, projectId, storageBucket });
}

export function adminAuth() { ensureApp(); return getAuth(); }
export function adminDb() { ensureApp(); return getFirestore(); }
export function adminBucket() { ensureApp(); return getStorage().bucket(); }
