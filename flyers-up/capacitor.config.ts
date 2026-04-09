import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Architecture (locked): Capacitor native shell + hosted Next.js on your real production domain.
 *
 * Do not use `next export` for this app — API routes, SSR, auth, Stripe, and webhooks require the server.
 *
 * Release / store builds: set CAPACITOR_SERVER_URL to your production HTTPS origin, then `npx cap sync`.
 * Never ship store binaries with a dev or LAN URL unless you intend a test-only build.
 *
 * Development: CAPACITOR_SERVER_URL=http://192.168.x.x:3000 npx cap sync (cleartext allowed for http://)
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.flyersup.app',
  appName: 'Flyers Up',
  webDir: 'www',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
          androidScheme: 'https',
        },
      }
    : {}),
};

export default config;
