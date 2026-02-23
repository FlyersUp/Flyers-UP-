import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getActiveSubcategoriesByServiceSlug } from '@/lib/db/services';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/subcategories?serviceSlug=handyman
 * Returns active subcategories for a service.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceSlug = searchParams.get('serviceSlug')?.trim() ?? '';

  if (!serviceSlug) {
    return NextResponse.json({ ok: false, subcategories: [], error: 'serviceSlug required' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const subcategories = await getActiveSubcategoriesByServiceSlug(supabase, serviceSlug);
  return NextResponse.json({ ok: true, subcategories, serviceSlug });
}
