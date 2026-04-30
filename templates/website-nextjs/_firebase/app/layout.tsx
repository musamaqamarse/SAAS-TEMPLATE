import "./globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/firebase/auth-context";

export const metadata = {
  title: "__PROJECT_NAME__",
  description: "__DESCRIPTION__",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
