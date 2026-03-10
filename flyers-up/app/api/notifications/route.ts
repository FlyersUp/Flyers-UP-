/**
 * GET /api/notifications - List notifications with pagination
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? String(PAGE_SIZE), 10)));
    const offset = page * limit;

    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, actor_user_id, type, category, priority, title, body, entity_type, entity_id, booking_id, conversation_id, message_id, payment_id, payout_id, read, read_at, deep_link, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[notifications] list failed:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    return NextResponse.json({ notifications: data ?? [], page, limit });
  } catch (err) {
    console.error('[notifications] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
