/**
 * GET /api/notifications/preferences - Get preferences
 * PUT /api/notifications/preferences - Update preferences
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });

    if (!data) {
      return NextResponse.json({
        booking_push: true,
        message_push: true,
        payment_push: true,
        payout_push: true,
        marketing_in_app: true,
        quiet_hours_enabled: false,
        quiet_hours_start: null,
        quiet_hours_end: null,
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[notifications] preferences get error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const allowed = [
      'booking_push', 'message_push', 'payment_push', 'payout_push',
      'marketing_in_app', 'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end',
    ];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }

    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('user_notification_preferences')
      .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 });

    return NextResponse.json(data);
  } catch (err) {
    console.error('[notifications] preferences put error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
