import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — placeholder loyalty / repeat perks for UI (no fee impact).
 * Ensures a row exists for the authenticated customer.
 */
const DEFAULT_HOOKS = {
  repeat_visit_count: 0,
  loyalty_tier_placeholder: 'standard',
  discounted_rebooking_fee_eligible: false,
  priority_support_placeholder: false,
  repeat_customer_badge_placeholder: false,
};

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin
      .from('customer_loyalty_hooks')
      .select(
        'repeat_visit_count, loyalty_tier_placeholder, discounted_rebooking_fee_eligible, priority_support_placeholder, repeat_customer_badge_placeholder'
      )
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ hooks: existing }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const { data: created, error } = await admin
      .from('customer_loyalty_hooks')
      .insert({ user_id: user.id })
      .select(
        'repeat_visit_count, loyalty_tier_placeholder, discounted_rebooking_fee_eligible, priority_support_placeholder, repeat_customer_badge_placeholder'
      )
      .single();

    if (error) {
      console.warn('[loyalty-hooks] insert failed', error);
      return NextResponse.json({ hooks: DEFAULT_HOOKS }, { status: 200 });
    }

    return NextResponse.json({ hooks: created }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.warn('[loyalty-hooks] route error', e);
    return NextResponse.json({ hooks: DEFAULT_HOOKS }, { status: 200 });
  }
}
