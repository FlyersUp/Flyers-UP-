import type { Metadata, Viewport } from "next";
import { Montserrat, Oswald } from "next/font/google";
import "./globals.css";
import { ErrorReporter } from "@/components/ErrorReporter";
import { RootClassSync } from "@/components/RootClassSync";
import { Suspense } from "react";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  themeColor: "#058954",
};

export const metadata: Metadata = {
  title: "Flyers Up",
  description: "Book trusted local service pros.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Flyers Up",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          // Prevent auth/theme “flash” by setting classes before first paint.
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  try {
    const root = document.documentElement;

    // Theme (shared with ThemeProvider)
    // Preferred key: flyersup:theme = 'light' | 'dark' | 'system'
    // Legacy key: flyersup:darkMode = '1' | '0'
    const pref = window.localStorage.getItem('flyersup:theme');
    const legacy = window.localStorage.getItem('flyersup:darkMode');

    let resolvedDark = false;
    if (pref === 'dark') resolvedDark = true;
    else if (pref === 'light') resolvedDark = false;
    // Option C: only enable dark mode when explicitly chosen by the user.
    // Treat 'system' as light so OS preference doesn't force dark.
    else if (pref === 'system') resolvedDark = false;
    else if (legacy === '1' || legacy === '0') resolvedDark = legacy === '1';
    else resolvedDark = false;

    root.classList.toggle('dark', resolvedDark);

    // Role accent: set early to reduce accent flash.
    const path = window.location.pathname || '';
    if (path.startsWith('/signin') || path.startsWith('/signup')) {
      const sp = new URLSearchParams(window.location.search || '');
      const role = sp.get('role');
      if (role === 'pro') {
        root.classList.add('theme-pro');
        root.classList.remove('theme-customer');
      } else {
        root.classList.add('theme-customer');
        root.classList.remove('theme-pro');
      }
    } else if (path.startsWith('/pro') || path.startsWith('/dashboard/pro')) {
      root.classList.add('theme-pro');
      root.classList.remove('theme-customer');
    } else if (path.startsWith('/customer') || path.startsWith('/dashboard/customer')) {
      root.classList.add('theme-customer');
      root.classList.remove('theme-pro');
    }
  } catch {
    // ignore
  }
})();`,
          }}
        />
      </head>
      <body
        className={`${montserrat.variable} ${oswald.variable} antialiased`}
      >
        <ErrorReporter />
        <Suspense fallback={null}>
          <RootClassSync />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
