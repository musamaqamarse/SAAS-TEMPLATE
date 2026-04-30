import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "__PROJECT_NAME__",
  description: "__DESCRIPTION__",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
