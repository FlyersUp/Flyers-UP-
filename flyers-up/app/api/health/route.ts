export const runtime = 'nodejs';

export function GET() {
  const supabaseUrlSet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKeySet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKeySet = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return Response.json(
    {
      ok: true,
      env: {
        supabaseUrlSet,
        supabaseAnonKeySet,
        serviceRoleKeySet,
      },
    },
    { status: 200 }
  );
}


