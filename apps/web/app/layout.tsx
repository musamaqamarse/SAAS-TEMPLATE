import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "create-saas — scaffold a SaaS in under three minutes",
  description:
    "Pick a stack, click Generate, walk away with a working multi-app SaaS project. Backend, website, admin, mobile — wired to Supabase or Firebase, deployable on day one.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
