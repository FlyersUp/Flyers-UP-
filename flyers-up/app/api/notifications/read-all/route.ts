/**
 * POST /api/notifications/read-all - Mark all as read
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[notifications] mark all read error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
