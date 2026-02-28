/**
 * GET /api/pro/[proId]/subcategories
 * Returns subcategories this pro offers (from pro_service_subcategories).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ proId: string }> }
) {
  const { proId } = await params;
  if (!proId?.trim()) {
    return NextResponse.json({ ok: false, subcategories: [], error: 'proId required' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: links, error: linksErr } = await supabase
    .from('pro_service_subcategories')
    .select('subcategory_id')
    .eq('pro_id', proId.trim());

  if (linksErr || !links?.length) {
    return NextResponse.json({ ok: true, subcategories: [], proId });
  }

  const subIds = links.map((l) => l.subcategory_id);
  const { data: subs, error: subsErr } = await supabase
    .from('service_subcategories')
    .select('id, slug, name, description, sort_order')
    .in('id', subIds)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (subsErr) {
    return NextResponse.json({ ok: false, subcategories: [], error: 'Failed to fetch subcategories' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, subcategories: subs ?? [], proId });
}
