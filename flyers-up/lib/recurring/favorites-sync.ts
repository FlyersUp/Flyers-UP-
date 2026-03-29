import type { SupabaseClient } from '@supabase/supabase-js';

export async function setCustomerFavoritePro(
  admin: SupabaseClient,
  customerUserId: string,
  proServiceId: string,
  favorited: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: sp, error: spErr } = await admin.from('service_pros').select('user_id').eq('id', proServiceId).maybeSingle();
  if (spErr || !sp?.user_id) return { ok: false, message: 'Pro not found' };
  const proUserId = sp.user_id as string;
  const now = new Date().toISOString();

  if (favorited) {
    const { error: fErr } = await admin.from('favorite_pros').upsert(
      { customer_id: customerUserId, pro_id: proServiceId },
      { onConflict: 'customer_id,pro_id' }
    );
    if (fErr) return { ok: false, message: fErr.message };

    const { data: existing } = await admin
      .from('customer_pro_preferences')
      .select('first_favorited_at')
      .eq('customer_user_id', customerUserId)
      .eq('pro_user_id', proUserId)
      .maybeSingle();

    const firstAt = (existing as { first_favorited_at?: string } | null)?.first_favorited_at ?? now;

    const { error: pErr } = await admin.from('customer_pro_preferences').upsert(
      {
        customer_user_id: customerUserId,
        pro_user_id: proUserId,
        is_favorited: true,
        first_favorited_at: firstAt,
        last_interaction_at: now,
      },
      { onConflict: 'customer_user_id,pro_user_id' }
    );
    if (pErr) return { ok: false, message: pErr.message };
    return { ok: true };
  }

  await admin.from('favorite_pros').delete().eq('customer_id', customerUserId).eq('pro_id', proServiceId);
  const { error: uErr } = await admin
    .from('customer_pro_preferences')
    .update({ is_favorited: false, last_interaction_at: now, updated_at: now })
    .eq('customer_user_id', customerUserId)
    .eq('pro_user_id', proUserId);
  if (uErr) return { ok: false, message: uErr.message };
  return { ok: true };
}
