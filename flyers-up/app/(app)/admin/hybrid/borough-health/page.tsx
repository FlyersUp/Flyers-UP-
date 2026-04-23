import { BoroughHealthScreen } from '@/components/hybrid/BoroughHealthScreen';
import type { BoroughHealthRow, SupplyState } from '@/lib/hybrid-ui/types';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

type CategoryBoroughStatusRow = {
  occupation_slug: string | null;
  borough_slug: string | null;
  active_pro_count: number | null;
  visible_state: string | null;
  force_visible: boolean | null;
  force_hidden: boolean | null;
  ops_note: string | null;
};

function coerceState(value: string | null | undefined): SupplyState {
  if (value === 'strong' || value === 'weak' || value === 'inactive') return value;
  return 'inactive';
}

function titleizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default async function AdminBoroughHealthPage() {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('category_borough_status')
    .select('occupation_slug, borough_slug, active_pro_count, visible_state, force_visible, force_hidden, ops_note')
    .order('occupation_slug', { ascending: true });

  if (error) {
    console.error('[borough-health]', error);
  }

  const rowsByOccupation = new Map<string, CategoryBoroughStatusRow[]>();
  for (const raw of data ?? []) {
    const row = raw as CategoryBoroughStatusRow;
    const occupationSlug = String(row.occupation_slug ?? '').trim();
    if (!occupationSlug) continue;
    const existing = rowsByOccupation.get(occupationSlug) ?? [];
    existing.push(row);
    rowsByOccupation.set(occupationSlug, existing);
  }

  const initialRows: BoroughHealthRow[] = [...rowsByOccupation.entries()]
    .map(([occupationSlug, rows]) => {
      const activePros = rows.reduce((sum, row) => sum + Math.max(0, Number(row.active_pro_count ?? 0)), 0);
      const hasStrong = rows.some((row) => coerceState(row.visible_state) === 'strong');
      const hasWeak = rows.some((row) => coerceState(row.visible_state) === 'weak');
      const weakCount = rows.filter((row) => coerceState(row.visible_state) === 'weak').length;
      const forceVisible = rows.some((row) => Boolean(row.force_visible));
      const forceHidden = rows.some((row) => Boolean(row.force_hidden));
      const opsNote = rows.map((row) => row.ops_note?.trim() ?? '').find((note) => note.length > 0) ?? undefined;
      return {
        id: occupationSlug,
        occupation: titleizeSlug(occupationSlug),
        activePros,
        state: hasStrong ? 'strong' : hasWeak ? 'weak' : 'inactive',
        responseReliability: '—',
        weakSignals: weakCount > 0 ? `${weakCount} weak borough${weakCount === 1 ? '' : 's'}` : '—',
        opsNote,
        forceVisible,
        forceHidden,
      } satisfies BoroughHealthRow;
    })
    .sort((a, b) => b.activePros - a.activePros);

  return <BoroughHealthScreen initialRows={initialRows} />;
}
