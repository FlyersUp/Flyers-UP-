/**
 * GET /api/pro/[proId]/subcategories
 * Returns subcategories this pro offers (from pro_service_subcategories).
 * Filters by service when serviceSlug or subcategorySlug is provided, so only
 * subcategories for the relevant service (e.g. pet-care) are returned.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proId: string }> }
) {
  const { proId } = await params;
  if (!proId?.trim()) {
    return NextResponse.json({ ok: false, subcategories: [], error: 'proId required' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const serviceSlug = searchParams.get('serviceSlug')?.trim() ?? undefined;
  const subcategorySlug = searchParams.get('subcategorySlug')?.trim() ?? undefined;

  const supabase = await createServerSupabaseClient();

  // Resolve service_id to filter subcategories (only show subcategories for the relevant service)
  let filterServiceId: string | null = null;
  if (serviceSlug) {
    const { data: svc } = await supabase
      .from('services')
      .select('id')
      .eq('slug', serviceSlug)
      .eq('is_active', true)
      .maybeSingle();
    filterServiceId = svc?.id ?? null;
  } else if (subcategorySlug) {
    const { data: sub } = await supabase
      .from('service_subcategories')
      .select('service_id')
      .eq('slug', subcategorySlug)
      .eq('is_active', true)
      .maybeSingle();
    filterServiceId = sub?.service_id ?? null;
  }
  if (!filterServiceId && !serviceSlug && !subcategorySlug) {
    // No filter: use pro's primary service
    const { data: proRow } = await supabase
      .from('service_pros')
      .select('primary_service_id, category_id')
      .eq('id', proId.trim())
      .maybeSingle();
    if ((proRow as any)?.primary_service_id) {
      filterServiceId = (proRow as any).primary_service_id;
    } else if ((proRow as any)?.category_id) {
      const { data: cat } = await supabase
        .from('service_categories')
        .select('slug')
        .eq('id', (proRow as any).category_id)
        .maybeSingle();
      if (cat?.slug) {
        const { data: svc } = await supabase
          .from('services')
          .select('id')
          .eq('slug', cat.slug)
          .eq('is_active', true)
          .maybeSingle();
        filterServiceId = svc?.id ?? null;
      }
    }
  }

  const { data: links, error: linksErr } = await supabase
    .from('pro_service_subcategories')
    .select('subcategory_id')
    .eq('pro_id', proId.trim());

  if (linksErr || !links?.length) {
    return NextResponse.json({ ok: true, subcategories: [], proId });
  }

  const subIds = links.map((l) => l.subcategory_id);
  let query = supabase
    .from('service_subcategories')
    .select('id, slug, name, description, sort_order')
    .in('id', subIds)
    .eq('is_active', true);

  if (filterServiceId) {
    query = query.eq('service_id', filterServiceId);
  }

  const { data: subs, error: subsErr } = await query.order('sort_order', { ascending: true });

  if (subsErr) {
    return NextResponse.json({ ok: false, subcategories: [], error: 'Failed to fetch subcategories' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, subcategories: subs ?? [], proId });
}
