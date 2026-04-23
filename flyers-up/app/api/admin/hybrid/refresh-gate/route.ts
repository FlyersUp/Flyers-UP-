import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST — recomputes category_borough_status from live pro supply (service role RPC). */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(supabase, user))) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin.rpc('refresh_category_borough_status', { p_threshold_strong: 3 });
  if (error) {
    console.error('[refresh-gate]', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
