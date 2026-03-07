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
    ],
    apple: "/icons/flyer-icon.png?v=2",
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
