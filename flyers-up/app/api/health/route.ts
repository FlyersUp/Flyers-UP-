export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

export async function GET() {
  return Response.json({
    ok: true,
    ts: Date.now(),
  });
}
