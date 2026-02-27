import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getMarketplacePros } from '@/lib/db/services';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/pros?serviceSlug=handyman&subcategorySlug=light-electrical
 * Returns pros for the service, optionally filtered by subcategory.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceSlug = searchParams.get('serviceSlug')?.trim() ?? '';
  const subcategorySlug = searchParams.get('subcategorySlug')?.trim() ?? undefined;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50));

  if (!serviceSlug) {
    return Response.json({ ok: false, pros: [], error: 'serviceSlug required' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const pros = await getMarketplacePros(supabase, {
    serviceSlug,
    subcategorySlug,
    limit,
  });

  return Response.json({
    ok: true,
    pros,
    serviceSlug,
    subcategorySlug: subcategorySlug ?? null,
  });
}
