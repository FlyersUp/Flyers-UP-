/**
 * POST /api/notifications/devices - Register push device
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: {
      onesignal_player_id?: string;
      onesignal_subscription_id?: string;
      external_user_id?: string;
      platform?: string;
      device_label?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const playerId = body.onesignal_player_id?.trim();
    if (!playerId) return NextResponse.json({ error: 'onesignal_player_id required' }, { status: 400 });

    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin
      .from('user_push_devices')
      .select('id')
      .eq('onesignal_player_id', playerId)
      .maybeSingle();

    const payload = {
      user_id: user.id,
      onesignal_player_id: playerId,
      onesignal_subscription_id: body.onesignal_subscription_id?.trim() ?? null,
      external_user_id: body.external_user_id?.trim() ?? user.id,
      platform: body.platform?.trim() ?? 'web',
      device_label: body.device_label?.trim() ?? null,
      notifications_enabled: true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = existing
      ? await admin.from('user_push_devices').update(payload).eq('id', existing.id).select().single()
      : await admin.from('user_push_devices').insert(payload).select().single();

    if (error) {
      console.error('[notifications] device register failed:', error);
      return NextResponse.json({ error: 'Failed to register device' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, device: data });
  } catch (err) {
    console.error('[notifications] devices post error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
