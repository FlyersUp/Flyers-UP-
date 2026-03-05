/**
 * GET /api/admin/marketplace/settings - Read admin_settings
 * PATCH /api/admin/marketplace/settings - Update admin_settings (logs admin_override)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';
import { adminSettingsUpdateSchema } from '@/lib/marketplace/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(supabase, user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('admin_settings')
      .select('key, value')
      .in('key', ['surge_rules', 'heatmap_rules', 'claim_rules']);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings: Record<string, unknown> = {};
    for (const row of data ?? []) {
      settings[row.key] = row.value;
    }
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('[admin/marketplace/settings] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(supabase, user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = adminSettingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    if (parsed.data.surge_rules) {
      const { data: before } = await admin.from('admin_settings').select('value').eq('key', 'surge_rules').single();
      await admin.from('admin_settings').upsert(
        { key: 'surge_rules', value: parsed.data.surge_rules as unknown as Record<string, unknown> },
        { onConflict: 'key' }
      );
      await admin.from('marketplace_events').insert({
        actor_type: 'admin',
        actor_id: user.id,
        event_type: 'admin_override',
        payload: {
          key: 'surge_rules',
          before: before?.value ?? null,
          after: parsed.data.surge_rules,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/marketplace/settings] PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
