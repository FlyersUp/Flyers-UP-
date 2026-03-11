import { NextResponse } from "next/server";

/**
 * Debug endpoint: returns whether NEXT_PUBLIC_ONESIGNAL_APP_ID is set (server-side).
 * Does NOT expose the actual value. Use to verify env loading.
 */
export async function GET() {
  const hasAppId = !!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  return NextResponse.json({
    hasAppId,
    hint: hasAppId
      ? "Server sees the env var. If client still shows missing, restart dev server."
      : "Server does NOT see it. Ensure .env.local is in flyers-up/ (next to next.config.js) and restart dev server.",
  });
}
