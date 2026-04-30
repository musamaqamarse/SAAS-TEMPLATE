"use client";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await signOut(auth);
        router.push("/login");
      }}
      className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-black/5 dark:hover:bg-white/5"
    >
      Log out
    </button>
  );
}
