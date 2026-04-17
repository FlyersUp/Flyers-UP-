const path = require("path");
const fs = require("fs");
const createNextIntlPlugin = require("next-intl/plugin");

// Explicitly load .env.local from this directory (fixes cwd/env loading issues)
const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed) continue;
    const m = trimmed.match(/^NEXT_PUBLIC_ONESIGNAL_APP_ID=(.+)$/);
    if (m && !process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) {
      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID = m[1].trim().replace(/^["']|["']$/g, "");
      break;
    }
  }
}

const withPWA = require("next-pwa")({
  dest: "public",
  // TEMPORARY: Disabled for OneSignal push isolation debugging. Re-enable after push works.
  register: false,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
});

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig = {
  env: {
    NEXT_PUBLIC_FEATURE_LAUNCH_MODE:
      process.env.NEXT_PUBLIC_FEATURE_LAUNCH_MODE ?? process.env.FEATURE_LAUNCH_MODE ?? '',
  },
  images: {
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [
          {
            protocol: "https",
            hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

module.exports = withPWA(withNextIntl(nextConfig));
