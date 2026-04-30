import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

export const health = onRequest({ cors: true }, (_req, res) => {
  res.json({ status: "ok" });
});

// Example: when a profile is created, write an audit_log entry.
export const onProfileCreated = onDocumentCreated("profiles/{uid}", async (event) => {
  const uid = event.params.uid;
  const db = getFirestore();
  await db.collection("audit_log").add({
    userId: uid,
    action: "profile.created",
    createdAt: new Date(),
  });
});
