import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Architecture (locked): Capacitor native shell + hosted Next.js on production.
 * For local dev against LAN HTTP, temporarily point `server.url` at your machine and set `cleartext: true`.
 */
const config: CapacitorConfig = {
  appId: 'com.flyersup.app',
  appName: 'Flyers Up',
  webDir: 'www',
  server: {
    url: 'https://www.flyersup.app',
    cleartext: false,
  },
};

export default config;
