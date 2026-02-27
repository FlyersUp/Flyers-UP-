import "./globals.css";
import { ErrorReporter } from "@/components/ErrorReporter";

/**
 * TEMP: Minimal static layout (no fonts, PWA, RootClassSync).
 * Restore full layout when done debugging.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ErrorReporter />
        {children}
      </body>
    </html>
  );
}
