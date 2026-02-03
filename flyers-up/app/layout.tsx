import type { Metadata } from "next";
import { Montserrat, Oswald } from "next/font/google";
import "./globals.css";
import { ErrorReporter } from "@/components/ErrorReporter";

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

export const metadata: Metadata = {
  title: "Flyers Up - Local Service Marketplace",
  description: "Book trusted local pros and grow your service business from your phone.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    let resolvedDark = false;
    if (pref === 'dark') resolvedDark = true;
    else if (pref === 'light') resolvedDark = false;
    else if (pref === 'system') resolvedDark = Boolean(prefersDark);
    else if (legacy === '1' || legacy === '0') resolvedDark = legacy === '1';
    else resolvedDark = Boolean(prefersDark);

    root.classList.toggle('dark', resolvedDark);

    // Role accent: for auth routes derive from ?role=... before React hydrates.
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
        {children}
      </body>
    </html>
  );
}
