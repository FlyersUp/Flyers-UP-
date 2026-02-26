import "./globals.css";

/**
 * TEMP: Minimal static layout (no fonts, PWA, ErrorReporter, RootClassSync).
 * Restore full layout when done debugging.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
