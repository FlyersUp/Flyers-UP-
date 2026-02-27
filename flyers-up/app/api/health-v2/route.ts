export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

import { createAdminSupabaseClient } from '@/lib/supabaseServer';

function safeUrl(u: string | undefined | null): string | null {
  if (!u) return null;
  const trimmed = u.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return trimmed;
  }
}

export async function GET() {
  const nextPublicSupabaseUrl = safeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseUrl = safeUrl(process.env.SUPABASE_URL);

  const supabaseUrlSet = Boolean(nextPublicSupabaseUrl);
  const supabaseAnonKeySet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKeySet = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let adminReadOk: boolean | null = null;
  let adminReadError: string | null = null;
  if (serviceRoleKeySet) {
    try {
      const admin = createAdminSupabaseClient();
      const { error } = await admin.from('profiles').select('id').limit(1);
      adminReadOk = !error;
      adminReadError = error ? error.message : null;
    } catch (e) {
      adminReadOk = false;
      adminReadError = e instanceof Error ? e.message : 'admin client failed';
    }
  }

  return Response.json(
    {
      ok: true,
      schemaVersion: 'health-v2',
      generatedAt: new Date().toISOString(),
      vercel: {
        env: process.env.VERCEL_ENV ?? null,
        gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
        region: process.env.VERCEL_REGION ?? null,
      },
      env: {
        supabaseUrlSet,
        supabaseAnonKeySet,
        serviceRoleKeySet,
      },
      supabase: {
        nextPublicSupabaseUrl,
        supabaseUrl,
        usingUpstream: supabaseUrl || nextPublicSupabaseUrl ? (supabaseUrl ?? nextPublicSupabaseUrl) : null,
      },
      checks: {
        adminReadOk,
        adminReadError,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}

