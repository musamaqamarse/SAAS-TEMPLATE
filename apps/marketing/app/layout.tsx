import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "create-saas — scaffold a working SaaS in three minutes",
  description:
    "Backend, website, admin panel, mobile app, and infra — wired to Supabase or Firebase, deployable on day one.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
