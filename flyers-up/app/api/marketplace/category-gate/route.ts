import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { fetchCategoryGateRow } from '@/lib/marketplace/loadCategoryGate';
import { resolveOccupationSlugFromServiceSlug } from '@/lib/marketplace/resolveOccupationSlug';
import { normalizeBoroughSlug } from '@/lib/marketplace/nycBoroughs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/category-gate?serviceSlug=handyman&boroughSlug=brooklyn
 * Resolves marketplace service slug → occupation slug, then returns gate row.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceSlug = searchParams.get('serviceSlug')?.trim() ?? '';
  const boroughRaw = searchParams.get('boroughSlug')?.trim() ?? '';
  const boroughSlug = normalizeBoroughSlug(boroughRaw);

  if (!serviceSlug) {
    return Response.json({ ok: false, error: 'serviceSlug required' }, { status: 400 });
  }
  if (!boroughSlug) {
    return Response.json({ ok: false, error: 'boroughSlug invalid' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const occupationSlug = await resolveOccupationSlugFromServiceSlug(supabase, serviceSlug);
  if (!occupationSlug) {
    return Response.json({
      ok: true,
      gateUnknown: true,
      serviceSlug,
      boroughSlug,
      occupationSlug: null,
      row: null,
    });
  }

  const row = await fetchCategoryGateRow(supabase, { occupationSlug, boroughSlug });

  return Response.json({
    ok: true,
    gateUnknown: row == null,
    serviceSlug,
    boroughSlug,
    occupationSlug,
    row,
  });
}
