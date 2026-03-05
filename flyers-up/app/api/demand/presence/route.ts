/**
 * POST /api/demand/presence
 * Pro presence ping: update is_online, borough, neighborhood.
 * Called every ~30s by useProPresence hook.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { presencePingSchema } from '@/lib/marketplace/schema';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = presencePingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: proRow } = await admin
      .from('service_pros')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!proRow) {
      return NextResponse.json({ error: 'Pro account required' }, { status: 403 });
    }

    const { error } = await supabase
      .from('pro_presence')
      .upsert(
        {
          pro_id: proRow.id,
          updated_at: new Date().toISOString(),
          is_online: parsed.data.is_online,
          borough: parsed.data.borough ?? null,
          neighborhood: parsed.data.neighborhood ?? null,
          last_lat: parsed.data.last_lat ?? null,
          last_lng: parsed.data.last_lng ?? null,
        },
        { onConflict: 'pro_id' }
      );

    if (error) {
      console.error('[demand/presence] upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[demand/presence] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
