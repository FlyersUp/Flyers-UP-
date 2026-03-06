/**
 * GET /api/occupations/[slug]
 * Returns occupation with its services
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: occupation, error: occErr } = await supabase
      .from('occupations')
      .select('id, name, slug, icon, featured, created_at')
      .eq('slug', slug)
      .maybeSingle();

    if (occErr || !occupation) {
      return NextResponse.json({ error: 'Occupation not found' }, { status: 404 });
    }

    const { data: services, error: svcErr } = await supabase
      .from('occupation_services')
      .select('id, name, description, sort_order')
      .eq('occupation_id', occupation.id)
      .order('sort_order', { ascending: true });

    if (svcErr) {
      return NextResponse.json({ error: svcErr.message }, { status: 500 });
    }

    return NextResponse.json(
      { occupation, services: services ?? [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[api/occupations/[slug]] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
