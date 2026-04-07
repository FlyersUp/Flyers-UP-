/**
 * GET — whether the signed-in customer follows this pro
 * POST — follow
 * DELETE — unfollow
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { requireCustomerUser } from '@/lib/recurring/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ proId: string }> }) {
  const { proId: raw } = await params;
  const proId = normalizeUuidOrNull(raw);
  if (!proId) return NextResponse.json({ following: false }, { status: 200 });

  const supabase = await createServerSupabaseClient();
  const auth = await requireCustomerUser(supabase);
  if (!auth.ok) return NextResponse.json({ following: false }, { status: 401 });

  const { data } = await supabase
    .from('pro_follows')
    .select('id')
    .eq('follower_user_id', auth.userId)
    .eq('followed_pro_id', proId)
    .maybeSingle();

  return NextResponse.json({ following: Boolean(data?.id) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(_req: Request, { params }: { params: Promise<{ proId: string }> }) {
  const { proId: raw } = await params;
  const proId = normalizeUuidOrNull(raw);
  if (!proId) return NextResponse.json({ ok: false, error: 'Invalid pro' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const auth = await requireCustomerUser(supabase);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { error } = await supabase.from('pro_follows').insert({
    follower_user_id: auth.userId,
    followed_pro_id: proId,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, already: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('pro_follows insert', error);
    return NextResponse.json({ ok: false, error: 'Could not follow' }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ proId: string }> }) {
  const { proId: raw } = await params;
  const proId = normalizeUuidOrNull(raw);
  if (!proId) return NextResponse.json({ ok: false, error: 'Invalid pro' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const auth = await requireCustomerUser(supabase);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  await supabase
    .from('pro_follows')
    .delete()
    .eq('follower_user_id', auth.userId)
    .eq('followed_pro_id', proId);

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
