/**
 * GET /api/pro/growth-menu
 * Server-computed Growth drawer rows + profile strength for Improve Visibility.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { computeProfileStrengthV1 } from '@/lib/pro/profile-strength';
import { buildGrowthMenuResponse } from '@/lib/pro/build-growth-menu';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CANCELLED_STATUSES = [
  'cancelled',
  'declined',
  'cancelled_expired',
  'cancelled_by_customer',
  'cancelled_by_pro',
  'cancelled_admin',
  'expired_unpaid',
] as const;

const COMPLETED_JOB_STATUSES = ['paid', 'completed', 'review_pending'] as const;

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();

  const { data: pro } = await admin
    .from('service_pros')
    .select(
      `id, user_id, bio, category_id, occupation_id, service_radius, location,
       business_hours, stripe_account_id, stripe_charges_enabled,
       service_area_zip, service_area_mode, service_area_values, services_offered`
    )
    .eq('user_id', user.id)
    .maybeSingle();

  if (!pro?.id) {
    return NextResponse.json({ error: 'Pro not found' }, { status: 403 });
  }

  const proId = pro.id as string;
  const userId = user.id;

  const [
    totalBookings,
    cancelledBookings,
    completedBookings,
    reviewsAgg,
    disputesTotal,
    disputesOpen,
    relRow,
    profileRow,
    proProfileRow,
    subcatCount,
    rulesCount,
    legacyAvailCount,
  ] = await Promise.all([
    admin.from('bookings').select('id', { count: 'exact', head: true }).eq('pro_id', proId),
    admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('pro_id', proId)
      .in('status', [...CANCELLED_STATUSES]),
    admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('pro_id', proId)
      .in('status', [...COMPLETED_JOB_STATUSES]),
    admin.from('booking_reviews').select('rating').eq('pro_id', proId),
    admin.from('stripe_disputes').select('id', { count: 'exact', head: true }).eq('pro_user_id', userId),
    admin
      .from('stripe_disputes')
      .select('id', { count: 'exact', head: true })
      .eq('pro_user_id', userId)
      .eq('status', 'open'),
    admin.from('pro_reliability').select('reliability_score').eq('pro_id', proId).maybeSingle(),
    admin.from('profiles').select('avatar_url').eq('id', userId).maybeSingle(),
    admin.from('pro_profiles').select('profile_photo_path').eq('user_id', userId).maybeSingle(),
    admin.from('pro_service_subcategories').select('id', { count: 'exact', head: true }).eq('pro_id', proId),
    admin.from('pro_availability_rules').select('id', { count: 'exact', head: true }).eq('pro_user_id', userId),
    admin.from('pro_availability').select('id', { count: 'exact', head: true }).eq('pro_id', proId),
  ]);

  const total = totalBookings.count ?? 0;
  const cancelled = cancelledBookings.count ?? 0;
  const engagedJobsCount = Math.max(0, total - cancelled);
  const completedJobsCount = completedBookings.count ?? 0;

  const rawReviews = (reviewsAgg.data ?? []) as Array<{ rating?: number }>;
  const reviewCount = rawReviews.length;
  const avgRating =
    reviewCount > 0
      ? Math.round((rawReviews.reduce((s, r) => s + Number(r.rating ?? 0), 0) / reviewCount) * 10) / 10
      : null;

  const disputesTotalCount = disputesTotal.count ?? 0;
  const openDisputesCount = disputesOpen.count ?? 0;
  const reliabilityScore =
    typeof (relRow.data as { reliability_score?: number } | null)?.reliability_score === 'number'
      ? (relRow.data as { reliability_score: number }).reliability_score
      : null;

  const p = pro as Record<string, unknown>;
  const servicesOffered = Array.isArray(p.services_offered) ? (p.services_offered as string[]) : [];
  const serviceAreaValues = Array.isArray(p.service_area_values)
    ? (p.service_area_values as string[])
    : null;

  const profileStrength = computeProfileStrengthV1({
    avatarUrl: (profileRow.data as { avatar_url?: string } | null)?.avatar_url,
    profilePhotoPath: (proProfileRow.data as { profile_photo_path?: string } | null)?.profile_photo_path,
    bio: p.bio as string | null,
    categoryId: p.category_id as string | null,
    occupationId: p.occupation_id as string | null,
    subcategoryLinkCount: subcatCount.count ?? 0,
    servicesOfferedCount: servicesOffered.filter((s) => typeof s === 'string' && s.trim()).length,
    serviceRadius: p.service_radius != null ? Number(p.service_radius) : null,
    serviceAreaZip: p.service_area_zip as string | null,
    location: p.location as string | null,
    serviceAreaMode: p.service_area_mode as string | null,
    serviceAreaValues,
    businessHoursJson: p.business_hours as string | null,
    availabilityRuleCount: rulesCount.count ?? 0,
    legacyAvailabilityRowCount: legacyAvailCount.count ?? 0,
    stripeAccountId: p.stripe_account_id as string | null,
    stripeChargesEnabled: p.stripe_charges_enabled === true,
    hasCompletedPaidJob: completedJobsCount >= 1,
  });

  const payoutsReady =
    Boolean((p.stripe_account_id as string | null)?.trim()) && p.stripe_charges_enabled === true;

  const body = buildGrowthMenuResponse({
    completedJobsCount,
    totalJobsCount: total,
    engagedJobsCount,
    reviewCount,
    avgRating,
    disputesTotalCount,
    openDisputesCount,
    reliabilityScore,
    payoutsReady,
    profileStrength,
  });

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
