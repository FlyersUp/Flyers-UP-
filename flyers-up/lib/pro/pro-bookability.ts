/**
 * Whether customers may book / see a pro in marketplace flows.
 * Server-only: pass admin Supabase client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isProfileAccountClosed } from '@/lib/pro/account-status';

export async function isServiceProBookableByCustomers(
  admin: SupabaseClient,
  proId: string
): Promise<boolean> {
  const { data: pro, error } = await admin
    .from('service_pros')
    .select('user_id, available, closed_at')
    .eq('id', proId)
    .maybeSingle();

  if (error || !pro) return false;
  const row = pro as { user_id: string; available?: boolean; closed_at?: string | null };
  if (!row.available) return false;
  if (row.closed_at) return false;

  const { data: prof } = await admin.from('profiles').select('account_status').eq('id', row.user_id).maybeSingle();

  const st = (prof as { account_status?: string | null } | null)?.account_status;
  if (isProfileAccountClosed(st)) return false;

  return true;
}
