/**
 * Get current user's Stripe Connect account ID
 * Used by APIs that need to fetch account status (connect-v2/status)
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ accountId: null }, { status: 200 });

  const [pro, acc] = await Promise.all([
    supabase.from('service_pros').select('stripe_account_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('stripe_connect_accounts').select('stripe_account_id').eq('user_id', user.id).maybeSingle(),
  ]);
  const accountId = (pro.data as any)?.stripe_account_id ?? (acc.data as any)?.stripe_account_id ?? null;
  return NextResponse.json({ accountId });
}
