import type { SupabaseClient } from '@supabase/supabase-js';
import type { CategoryGateRowView, CategoryVisibleState } from '@/lib/marketplace/categoryGateTypes';

function asRow(data: Record<string, unknown> | null): CategoryGateRowView | null {
  if (!data) return null;
  const visibleState = data.visible_state as CategoryVisibleState;
  if (visibleState !== 'strong' && visibleState !== 'weak' && visibleState !== 'inactive') return null;
  return {
    occupationSlug: String(data.occupation_slug),
    boroughSlug: String(data.borough_slug),
    activeProCount: Number(data.active_pro_count ?? 0),
    visibleState,
    isCustomerVisible: Boolean(data.is_customer_visible),
    forceHidden: Boolean(data.force_hidden),
    forceVisible: Boolean(data.force_visible),
    lastCheckedAt: String(data.last_checked_at),
    opsNote: data.ops_note != null ? String(data.ops_note) : null,
  };
}

export async function fetchCategoryGateRow(
  supabase: SupabaseClient,
  params: { occupationSlug: string; boroughSlug: string }
): Promise<CategoryGateRowView | null> {
  const { data, error } = await supabase
    .from('category_borough_status')
    .select(
      'occupation_slug, borough_slug, active_pro_count, visible_state, is_customer_visible, force_hidden, force_visible, last_checked_at, ops_note'
    )
    .eq('occupation_slug', params.occupationSlug.trim())
    .eq('borough_slug', params.boroughSlug.trim())
    .maybeSingle();

  if (error) {
    console.error('[fetchCategoryGateRow]', error);
    return null;
  }
  return asRow(data as Record<string, unknown> | null);
}
