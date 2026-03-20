'use server';

/**
 * Server Actions for Pro Specialties
 */

import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireProUser } from '@/app/actions/_auth';

const MAX_SPECIALTIES = 8;
const MAX_LABEL_LENGTH = 40;

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

export type ProSpecialtyRow = {
  id: string;
  pro_id: string;
  label: string;
  normalized_label: string;
  active: boolean;
  created_at: string;
};

/** Get specialties for a pro (by user id = profiles.id) */
export async function getProSpecialtiesAction(
  proUserId: string,
  accessToken?: string
): Promise<{ data: ProSpecialtyRow[]; error?: string }> {
  try {
    await requireProUser({ accessToken });
    const admin = createAdminSupabaseClient();

    const { data, error } = await admin
      .from('pro_specialties')
      .select('id, pro_id, label, normalized_label, active, created_at')
      .eq('pro_id', proUserId)
      .order('created_at', { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as ProSpecialtyRow[] };
  } catch (err) {
    console.error('[proSpecialties] getProSpecialties:', err);
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load specialties' };
  }
}

/** Add a specialty */
export async function addProSpecialtyAction(
  label: string,
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await requireProUser({ accessToken });
    const admin = createAdminSupabaseClient();

    const trimmed = label.trim();
    if (!trimmed) return { success: false, error: 'Specialty label is required.' };
    if (trimmed.length > MAX_LABEL_LENGTH) {
      return { success: false, error: `Label must be ${MAX_LABEL_LENGTH} characters or less.` };
    }

    const normalized = normalizeLabel(trimmed);

    const { count } = await admin
      .from('pro_specialties')
      .select('*', { count: 'exact', head: true })
      .eq('pro_id', userId);

    if ((count ?? 0) >= MAX_SPECIALTIES) {
      return { success: false, error: `Maximum ${MAX_SPECIALTIES} specialties allowed.` };
    }

    const { error } = await admin.from('pro_specialties').insert({
      pro_id: userId,
      label: trimmed,
      normalized_label: normalized,
      active: true,
    });

    if (error) {
      if (error.code === '23505') return { success: false, error: 'You already have this specialty.' };
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[proSpecialties] addProSpecialty:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to add specialty' };
  }
}

/** Remove a specialty */
export async function removeProSpecialtyAction(
  specialtyId: string,
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await requireProUser({ accessToken });
    const admin = createAdminSupabaseClient();

    const { error } = await admin
      .from('pro_specialties')
      .delete()
      .eq('id', specialtyId)
      .eq('pro_id', userId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('[proSpecialties] removeProSpecialty:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to remove specialty' };
  }
}

/** Replace all specialties (used from onboarding/settings) */
export async function setProSpecialtiesAction(
  labels: string[],
  accessToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await requireProUser({ accessToken });
    const admin = createAdminSupabaseClient();

    const trimmed = labels
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, MAX_SPECIALTIES);

    const tooLong = trimmed.find((l) => l.length > MAX_LABEL_LENGTH);
    if (tooLong) {
      return { success: false, error: `"${tooLong.slice(0, 20)}..." exceeds ${MAX_LABEL_LENGTH} characters.` };
    }

    const normalizedSet = new Set<string>();
    const deduped: string[] = [];
    for (const t of trimmed) {
      const n = normalizeLabel(t);
      if (!normalizedSet.has(n)) {
        normalizedSet.add(n);
        deduped.push(t);
      }
    }

    await admin.from('pro_specialties').delete().eq('pro_id', userId);

    if (deduped.length > 0) {
      const rows = deduped.map((label) => ({
        pro_id: userId,
        label,
        normalized_label: normalizeLabel(label),
        active: true,
      }));
      const { error } = await admin.from('pro_specialties').insert(rows);
      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[proSpecialties] setProSpecialties:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save specialties' };
  }
}
