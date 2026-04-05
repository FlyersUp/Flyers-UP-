import "./globals.css";
import { ErrorReporter } from "@/components/ErrorReporter";
import { ThemeProviderWrapper } from "@/components/ThemeProviderWrapper";
import { NextIntlClientProvider } from "next-intl";
import { LocaleSync } from "@/components/LocaleSync";
import OneSignalLoader from "@/components/notifications/OneSignalLoader";
import { getLocale } from "next-intl/server";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-1024.png", sizes: "1024x1024", type: "image/png" },
      { url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-167.png", sizes: "167x167", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-167.png", sizes: "167x167", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

/**
 * Blocking script: apply .dark class before first paint to prevent theme flash.
 * Must run synchronously before body renders.
 * Keep logic in sync with DARK_MODE_END_USER_ENABLED in lib/themeFeatureFlags.ts (dark off => always false here).
 */
const themeInitScript = `
(function(){
  try {
    var darkModeShipped = false; /* DARK_MODE_END_USER_ENABLED */
    var t = localStorage.getItem('flyersup:theme');
    var d = localStorage.getItem('flyersup:darkMode');
    var wouldDark = t === 'dark' || ((!t || t === 'system') && d === '1');
    var dark = darkModeShipped && wouldDark;
    document.documentElement.classList.toggle('dark', dark);
  } catch(e){}
})();
`;

/** PWA standalone: matchMedia + iOS Add to Home Screen (navigator.standalone) — before first paint */
const standaloneInitScript = `
(function(){
  try {
    var mq = window.matchMedia && window.matchMedia('(display-mode: standalone)');
    var dm = mq && mq.matches;
    var ios = window.navigator && window.navigator.standalone === true;
    if (dm || ios) document.documentElement.classList.add('fu-standalone');
  } catch(e){}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="bg-bg text-text" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: standaloneInitScript }} />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.OneSignalDeferred = window.OneSignalDeferred || [];' +
              (process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
                ? `window.__ONESIGNAL_APP_ID__ = ${JSON.stringify(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID)};`
                : ""),
          }}
        />
      </head>
      <body
        className="min-h-dvh min-h-[100svh] w-full max-w-full overflow-x-clip bg-bg text-text antialiased"
        suppressHydrationWarning
      >
        <OneSignalLoader />
        <NextIntlClientProvider>
          <ThemeProviderWrapper>
            <LocaleSync />
            <ErrorReporter />
            {children}
          </ThemeProviderWrapper>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
