export const metadata = {
  title: "__PROJECT_NAME__ API",
  description: "__DESCRIPTION__",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
