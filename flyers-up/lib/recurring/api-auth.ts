import type { SupabaseClient } from '@supabase/supabase-js';

export async function requireCustomerUser(supabase: SupabaseClient): Promise<
  { ok: true; userId: string } | { ok: false; status: number; error: string }
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if ((profile?.role ?? 'customer') !== 'customer') {
    return { ok: false, status: 403, error: 'Customer only' };
  }
  return { ok: true, userId: user.id };
}

export async function requireProService(
  admin: SupabaseClient,
  supabase: SupabaseClient
): Promise<{ ok: true; userId: string; serviceId: string } | { ok: false; status: number; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' };
  const { data: pro } = await admin.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
  if (!pro?.id) return { ok: false, status: 403, error: 'Pro not found' };
  return { ok: true, userId: user.id, serviceId: pro.id };
}
