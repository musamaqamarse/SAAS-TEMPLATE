import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "__PROJECT_NAME__ — Admin",
  description: "Admin panel for __PROJECT_NAME__",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
