import "./globals.css";
import { ErrorReporter } from "@/components/ErrorReporter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/icons/flyer-icon.png?v=2", type: "image/png" },
      { url: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/flyer-icon.png?v=2",
  },
};

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
    <html lang="en" className="bg-[#F5F5F5] dark:bg-[#2d2d2d]" suppressHydrationWarning>
      <body className="min-h-screen bg-[#F5F5F5] dark:bg-[#2d2d2d] text-[#111111] dark:text-white" suppressHydrationWarning>
        <ErrorReporter />
        {children}
      </body>
    </html>
  );
}
