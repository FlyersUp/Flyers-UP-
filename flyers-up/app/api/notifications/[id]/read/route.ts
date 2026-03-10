/**
 * POST /api/notifications/[id]/read - Mark one as read
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = normalizeUuidOrNull(id);
    if (!notificationId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[notifications] mark read error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
