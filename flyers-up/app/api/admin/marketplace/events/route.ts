/**
 * GET /api/admin/marketplace/events
 * List marketplace_events with optional event_type filter
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(supabase, user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get('event_type');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

    const admin = createAdminSupabaseClient();
    let q = admin
      .from('marketplace_events')
      .select('id, created_at, actor_type, actor_id, event_type, payload')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventType) {
      q = q.eq('event_type', eventType);
    }

    const { data, error } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data ?? [] });
  } catch (err) {
    console.error('[admin/marketplace/events] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
