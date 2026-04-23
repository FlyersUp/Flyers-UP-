'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';
import { resolveCategoryBoroughGate } from '@/lib/marketplace/categoryGateLogic';

export async function updateCategoryBoroughOverride(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(supabase, user))) {
    throw new Error('Forbidden');
  }

  const occupationSlug = String(formData.get('occupation_slug') ?? '').trim();
  const boroughSlug = String(formData.get('borough_slug') ?? '').trim();
  const forceHidden = formData.get('force_hidden') === 'on';
  const forceVisible = formData.get('force_visible') === 'on';
  const opsNoteRaw = formData.get('ops_note');
  const opsNote = typeof opsNoteRaw === 'string' ? opsNoteRaw.trim().slice(0, 2000) || null : null;

  if (!occupationSlug || !boroughSlug) {
    throw new Error('Missing keys');
  }

  const admin = createAdminSupabaseClient();
  const { data: row, error: fetchErr } = await admin
    .from('category_borough_status')
    .select('active_pro_count, force_hidden, force_visible')
    .eq('occupation_slug', occupationSlug)
    .eq('borough_slug', boroughSlug)
    .maybeSingle();

  if (fetchErr || !row) {
    throw new Error('Row not found');
  }

  const activeProCount = Number((row as { active_pro_count: number }).active_pro_count ?? 0);
  const gate = resolveCategoryBoroughGate({
    activeProCount,
    forceHidden,
    forceVisible,
    thresholdStrong: 3,
  });

  const { error } = await admin
    .from('category_borough_status')
    .update({
      force_hidden: forceHidden,
      force_visible: forceVisible,
      ops_note: opsNote,
      visible_state: gate.visibleState,
      is_customer_visible: gate.isCustomerVisible,
      updated_at: new Date().toISOString(),
    })
    .eq('occupation_slug', occupationSlug)
    .eq('borough_slug', boroughSlug);

  if (error) {
    console.error('[updateCategoryBoroughOverride]', error);
    throw new Error(error.message);
  }

  revalidatePath('/admin/hybrid/category-health');
}
