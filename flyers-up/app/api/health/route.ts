export const runtime = 'nodejs';
export const preferredRegion = ['cle1']; // US East (Ohio)

/**
 * Simple app health for monitors (UptimeRobot, etc.).
 * Does NOT call Supabase – use for "is the app up?" only.
 */
export async function GET() {
  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
    app: 'flyers-up',
  });
}
