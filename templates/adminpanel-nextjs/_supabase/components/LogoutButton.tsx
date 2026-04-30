"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/login");
      }}
      className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-black/5 dark:hover:bg-white/5"
    >
      Log out
    </button>
  );
}
