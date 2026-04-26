import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PublicReviewCard = {
  id: string;
  customerName: string;
  neighborhood: string;
  serviceCategory: string;
  rating: number;
  quote: string;
};

function toCustomerName(firstName: string | null, fullName: string | null): string {
  const first = (firstName ?? '').trim();
  const full = (fullName ?? '').trim();
  const source = first || full;
  if (!source) return 'Flyers Up customer';
  const parts = source.split(/\s+/).filter(Boolean);
  const resolvedFirst = first || parts[0] || 'Customer';
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0]}.` : '';
  return `${resolvedFirst}${lastInitial ? ` ${lastInitial}` : ''}`;
}

export async function GET() {
  const admin = createAdminSupabaseClient();
  const { data: rows, error } = await admin
    .from('booking_reviews')
    .select('id, customer_id, pro_id, rating, comment, is_public')
    .eq('is_public', true)
    .not('comment', 'is', null)
    .order('created_at', { ascending: false })
    .limit(6);

  if (error) {
    return Response.json({ ok: false, reviews: [], error: error.message }, { status: 500 });
  }

  const reviewsRaw = (rows ?? []).filter((r: { comment?: string | null }) => (r.comment ?? '').trim().length > 0);
  if (reviewsRaw.length === 0) {
    return Response.json({ ok: true, reviews: [] as PublicReviewCard[] });
  }

  const customerIds = [...new Set(reviewsRaw.map((r: { customer_id: string }) => r.customer_id))];
  const proIds = [...new Set(reviewsRaw.map((r: { pro_id: string }) => r.pro_id))];
  const [profilesRes, prosRes] = await Promise.all([
    admin.from('profiles').select('id, first_name, full_name').in('id', customerIds),
    admin.from('service_pros').select('id, location, category_id').in('id', proIds),
  ]);

  const profilesById = new Map(
    (profilesRes.data ?? []).map((p: { id: string; first_name?: string | null; full_name?: string | null }) => [p.id, p])
  );
  const prosById = new Map(
    (prosRes.data ?? []).map((p: { id: string; location?: string | null; category_id?: string | null }) => [p.id, p])
  );

  const categoryIds = [...new Set((prosRes.data ?? []).map((p: { category_id?: string | null }) => p.category_id).filter(Boolean))];
  const { data: cats } = categoryIds.length
    ? await admin.from('service_categories').select('id, name').in('id', categoryIds as string[])
    : { data: [] as Array<{ id: string; name: string }> };
  const categoryById = new Map((cats ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));

  const reviews: PublicReviewCard[] = reviewsRaw.map((r: any) => {
    const profile = profilesById.get(r.customer_id);
    const pro = prosById.get(r.pro_id);
    const category = pro?.category_id ? categoryById.get(pro.category_id) : null;
    return {
      id: r.id,
      customerName: toCustomerName(profile?.first_name ?? null, profile?.full_name ?? null),
      neighborhood: (pro?.location ?? '').trim() || 'Local area',
      serviceCategory: (category ?? 'Service').trim(),
      rating: Math.max(1, Math.min(5, Number(r.rating) || 0)),
      quote: String(r.comment ?? '').trim(),
    };
  });

  return Response.json({ ok: true, reviews });
}
