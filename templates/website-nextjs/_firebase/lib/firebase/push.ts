"use client";
import { getMessaging, getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { app } from "./client";

export async function initPushAndGetToken(vapidKey: string): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const registration = await navigator.serviceWorker.register("/api/firebase-sw", { scope: "/" });
    const messaging = getMessaging(app());
    return await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  } catch {
    return null;
  }
}

export function onForegroundMessage(callback: (payload: MessagePayload) => void) {
  if (typeof window === "undefined") return () => {};
  const messaging = getMessaging(app());
  return onMessage(messaging, callback);
}
