"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export function useRequireAdmin() {
  const router = useRouter();
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      // TODO: tighten — verify a custom claim like `admin: true` before allowing access.
      // Example: const token = await user.getIdTokenResult(); if (!token.claims.admin) router.replace("/login");
      if (!user) router.replace("/login");
    });
    return unsub;
  }, [router]);
}
