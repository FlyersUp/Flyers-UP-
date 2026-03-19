/**
 * GET /api/pro/[proId]/reviews
 * Returns public reviews for a pro: summary, distribution, highlight tags, review list.
 */
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ proId: string }> }
) {
  try {
    const { proId } = await params;
    const id = normalizeUuidOrNull(proId);
    if (!id) return NextResponse.json({ error: 'Invalid pro ID' }, { status: 400 });

    const admin = createAdminSupabaseClient();

    // Fetch public reviews only (is_public = true, or column may not exist)
    const selectCols = 'id, booking_id, customer_id, pro_id, rating, comment, created_at';
    const extendedCols = 'id, booking_id, customer_id, pro_id, rating, comment, created_at, tags, is_public';

    let reviewsRaw: Array<Record<string, unknown>> = [];
    let error: { message?: string; code?: string } | null = null;

    const { data: extData, error: extErr } = await admin
      .from('booking_reviews')
      .select(extendedCols)
      .eq('pro_id', id)
      .order('created_at', { ascending: false });

    if (extErr) {
      const colErr = extErr.message?.includes('does not exist') || extErr.code === '42703';
      if (colErr) {
        const fallback = await admin
          .from('booking_reviews')
          .select(selectCols)
          .eq('pro_id', id)
          .order('created_at', { ascending: false });
        reviewsRaw = (fallback.data ?? []).map((r: Record<string, unknown>) => ({
          ...r,
          tags: [] as string[],
          is_public: true,
        }));
        error = fallback.error as { message?: string; code?: string } | null;
      } else {
        error = extErr as { message?: string; code?: string };
      }
    } else {
      reviewsRaw = (extData ?? []) as Array<Record<string, unknown>>;
    }

    if (error) {
      console.error('reviews fetch error:', error);
      return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
    }

    const raw = reviewsRaw as Array<{
      id: string;
      booking_id: string;
      customer_id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      tags?: string[] | null;
      is_public?: boolean;
    }>;

    // Filter to public only (when is_public column exists)
    const publicReviews = raw.filter((r) => r.is_public !== false);

    if (publicReviews.length === 0) {
      return NextResponse.json(
        {
          avgRating: null,
          reviewCount: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          highlightTags: [],
          reviews: [],
        },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
      );
    }

    // Compute summary
    const avgRating =
      publicReviews.reduce((s, r) => s + r.rating, 0) / publicReviews.length;
    const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    publicReviews.forEach((r) => {
      const k = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      ratingDistribution[k]++;
    });

    // Highlight tags: most common positive traits

    const tagCounts = new Map<string, number>();
    const POSITIVE_TAGS = new Set([
      'Punctual', 'Professional', 'Quality work', 'Friendly', 'Thorough',
      'On time', 'Great communication', 'Would book again',
    ]);
    publicReviews.forEach((r) => {
      const tags = (r.tags ?? []) as string[];
      tags.forEach((t) => {
        if (POSITIVE_TAGS.has(t)) {
          tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
        }
      });
    });
    const highlightTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);

    // Fetch reviewer first names
    const customerIds = [...new Set(publicReviews.map((r) => r.customer_id))];
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, first_name')
      .in('id', customerIds);
    const nameByCustomer = new Map<string, string>();
    (profiles ?? []).forEach((p: { id: string; first_name?: string | null }) => {
      const fn = (p.first_name ?? '').trim();
      nameByCustomer.set(p.id, fn ? `${fn[0]}.` : 'Customer');
    });

    // Fetch service name from pro's category
    const { data: pros } = await admin
      .from('service_pros')
      .select('id, category_id')
      .eq('id', id)
      .maybeSingle();
    const catId = (pros as { category_id?: string } | null)?.category_id;
    let serviceName: string | null = null;
    if (catId) {
      const { data: cat } = await admin
        .from('service_categories')
        .select('name')
        .eq('id', catId)
        .maybeSingle();
      serviceName = (cat as { name?: string } | null)?.name ?? null;
    }

    const reviewsOut = publicReviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.comment ?? '',
      tags: (r.tags ?? []) as string[],
      createdAt: r.created_at,
      reviewerFirstName: nameByCustomer.get(r.customer_id) ?? 'Customer',
      jobTitle: serviceName,
      verifiedBooking: true,
      photoUrls: [] as string[],
    }));

    return NextResponse.json(
      {
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: publicReviews.length,
        ratingDistribution,
        highlightTags,
        reviews: reviewsOut,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (err) {
    console.error('reviews API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
