/**
 * GET /api/occupations
 * Query params: featured=true | search=...
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const featured = searchParams.get('featured') === 'true';
    const search = searchParams.get('search')?.trim();

    let q = supabase
      .from('occupations')
      .select('id, name, slug, icon, featured, created_at')
      .order('name', { ascending: true });

    if (featured) {
      q = q.eq('featured', true);
    }

    if (search) {
      q = q.ilike('name', `%${search}%`);
    }

    const { data, error } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { occupations: data ?? [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (err) {
    console.error('[api/occupations] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
