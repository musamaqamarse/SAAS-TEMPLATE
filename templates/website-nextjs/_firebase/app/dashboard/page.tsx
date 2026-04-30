"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/lib/firebase/auth-context";
import { auth } from "@/lib/firebase/client";
import { initPushAndGetToken, onForegroundMessage } from "@/lib/firebase/push";
import { Button } from "@/components/ui";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [pushDenied, setPushDenied] = useState(false);
  const [notification, setNotification] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return;
    initPushAndGetToken(vapidKey).then((token) => {
      if (token) setFcmToken(token);
      else setPushDenied(true);
    });
    const unsub = onForegroundMessage(({ notification: n }) => {
      if (n) setNotification({ title: n.title ?? "", body: n.body ?? "" });
    });
    return unsub;
  }, [user]);

  if (loading || !user) return <main className="p-8">Loading…</main>;

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-4">
      {notification && (
        <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-sm">
          <strong>{notification.title}</strong>
          {notification.body && <p className="opacity-80">{notification.body}</p>}
          <button onClick={() => setNotification(null)} className="mt-1 text-xs underline opacity-60">dismiss</button>
        </div>
      )}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button
          onClick={async () => {
            await signOut(auth());
            router.push("/login");
          }}
          className="bg-transparent border text-current"
        >
          Log out
        </Button>
      </header>
      <p className="opacity-80">Signed in as <strong>{user.email}</strong></p>
      <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded overflow-x-auto">
        {JSON.stringify({ uid: user.uid, email: user.email }, null, 2)}
      </pre>
      <div className="text-sm space-y-1">
        <p className="font-medium">Push notifications</p>
        {pushDenied && <p className="text-yellow-600 dark:text-yellow-400">Permission denied — enable notifications in browser settings.</p>}
        {fcmToken && (
          <p className="break-all font-mono text-xs bg-black/5 dark:bg-white/5 p-2 rounded">{fcmToken}</p>
        )}
      </div>
    </main>
  );
}
