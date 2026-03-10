/**
 * POST /api/users/block - Block a user
 * DELETE /api/users/block - Unblock a user
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { blockedUserId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const blockedUserId = normalizeUuidOrNull(body?.blockedUserId);
    if (!blockedUserId) return NextResponse.json({ error: 'Invalid blockedUserId' }, { status: 400 });

    if (blockedUserId === user.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { error } = await admin.from('blocked_users').insert({
      blocker_id: user.id,
      blocked_user_id: blockedUserId,
    });

    if (error) {
      if (error.code === '23505') return NextResponse.json({ ok: true }, { status: 200 });
      console.error('blocked_users insert failed:', error);
      return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('Block user API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const blockedUserId = normalizeUuidOrNull(searchParams.get('blockedUserId'));
    if (!blockedUserId) return NextResponse.json({ error: 'Invalid blockedUserId' }, { status: 400 });

    const admin = createAdminSupabaseClient();
    const { error } = await admin
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_user_id', blockedUserId);

    if (error) {
      console.error('blocked_users delete failed:', error);
      return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('Unblock user API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
