import "./globals.css";
import { ErrorReporter } from "@/components/ErrorReporter";
import { ThemeProviderWrapper } from "@/components/ThemeProviderWrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/icons/flyer-icon.png?v=2", type: "image/png" },
      { url: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-1024.png?v=2", sizes: "1024x1024", type: "image/png" },
      { url: "/icons/icon-180.png?v=2", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-167.png?v=2", sizes: "167x167", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-180.png?v=2", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-167.png?v=2", sizes: "167x167", type: "image/png" },
      { url: "/icons/flyer-icon.png?v=2", type: "image/png" },
    ],
  },
};

/**
 * Blocking script: apply .dark class before first paint to prevent theme flash.
 * Must run synchronously before body renders.
 */
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('flyersup:theme');
    var d = localStorage.getItem('flyersup:darkMode');
    var dark = t === 'dark' || ((!t || t === 'system') && d === '1');
    document.documentElement.classList.toggle('dark', dark);
  } catch(e){}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-bg text-text" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ? (
          <script
            dangerouslySetInnerHTML={{
              __html: 'window.OneSignalDeferred = window.OneSignalDeferred || [];',
            }}
          />
        ) : null}
        {process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ? (
          <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer />
        ) : null}
      </head>
      <body className="min-h-screen bg-bg text-text antialiased" suppressHydrationWarning>
        <ThemeProviderWrapper>
          <ErrorReporter />
          {children}
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
