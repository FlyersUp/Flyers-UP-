/**
 * POST /api/customer/pros/[proId]/favorite — add favorite
 * DELETE /api/customer/pros/[proId]/favorite — remove favorite
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { setCustomerFavoritePro } from '@/lib/recurring/favorites-sync';
import { requireCustomerUser } from '@/lib/recurring/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: Promise<{ proId: string }> }) {
  const { proId: raw } = await params;
  const proId = normalizeUuidOrNull(raw);
  if (!proId) return NextResponse.json({ ok: false, error: 'Invalid pro' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const auth = await requireCustomerUser(supabase);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const admin = createAdminSupabaseClient();
  const r = await setCustomerFavoritePro(admin, auth.userId, proId, true);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ proId: string }> }) {
  const { proId: raw } = await params;
  const proId = normalizeUuidOrNull(raw);
  if (!proId) return NextResponse.json({ ok: false, error: 'Invalid pro' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const auth = await requireCustomerUser(supabase);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const admin = createAdminSupabaseClient();
  const r = await setCustomerFavoritePro(admin, auth.userId, proId, false);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
