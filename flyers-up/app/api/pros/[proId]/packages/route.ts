import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { mapServicePackageRow } from '@/lib/service-packages/db-map';
import { rowToPublic } from '@/types/service-packages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Active packages for a marketplace pro (service_pros.id). Authenticated users only; empty if pro unavailable.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ proId: string }> }) {
  const { proId } = await ctx.params;
  const id = proId?.trim();
  if (!id) return NextResponse.json({ error: 'Missing pro id' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: pro, error: proErr } = await supabase
    .from('service_pros')
    .select('user_id, available')
    .eq('id', id)
    .maybeSingle();

  if (proErr) return NextResponse.json({ error: proErr.message }, { status: 500 });
  if (!pro) return NextResponse.json({ ok: true, packages: [] });

  if (!(pro as { available?: boolean }).available) {
    return NextResponse.json({ ok: true, packages: [] });
  }

  const proUserId = String((pro as { user_id: string }).user_id);

  const { data, error } = await supabase
    .from('service_packages')
    .select('*')
    .eq('pro_user_id', proUserId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const packages = (data ?? []).map((r) => rowToPublic(mapServicePackageRow(r as Record<string, unknown>)));
  return NextResponse.json({ ok: true, packages });
}
