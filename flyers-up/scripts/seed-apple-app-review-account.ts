/**
 * Apple App Review — seeds Supabase Auth, profiles, service pro rows, and demo bookings
 * for reviewer@flyersup.app only. Run after migrations are applied.
 *
 * Usage (from `flyers-up/` directory):
 *   npx tsx scripts/seed-apple-app-review-account.ts
 *
 * Required environment variables:
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import {
  APPLE_APP_REVIEW_ACCOUNT_EMAIL,
  APPLE_APP_REVIEW_BOOKING_NOTES_MARKER,
} from '../lib/appleAppReviewAccount';

const DEMO_ASSIGNED_PRO_EMAIL = 'flyersup-app-review-assigned-pro@flyersup.app';
/** Password for Apple reviewers (App Store Connect). */
const REVIEWER_PASSWORD = 'FlyersUp123!';
/**
 * Synthetic “assigned pro” login — not shared with Apple; exists only so customer bookings
 * reference a realistic other party. Rotating password keeps re-runs idempotent via updateUser.
 */
const INTERNAL_ASSIGNED_PRO_PASSWORD =
  'InternalAssignedPro_9f3c2a1e_AppReviewOnly_DoNotUseInProduction';

/** Logins for synthetic pros (not shared with Apple); used only to satisfy DB auth + RLS. */
const INTERNAL_DEMO_SUPPLY_PRO_PASSWORD =
  'InternalDemoSupply_7b1d4e9c_AppReviewOnly_DoNotUseInProduction';

const TZ = 'America/New_York';

// Apple Review Demo Mode (reviewer@flyersup.app only) — profiles.email must match ilike `flyersup-review-demo-%` (see lib/appReviewDemoSupply.ts).
const DEMO_SUPPLY_SPECS = [
  {
    email: 'flyersup-review-demo-cleaner@flyersup.app',
    firstName: 'Morgan',
    lastName: 'Reed',
    displayName: 'Morgan Reed',
    bio: 'Residential cleaning and move-out turnovers — punctual, insured, supplies included.',
    occupationSlug: 'cleaner',
    categorySlug: 'cleaning',
    serviceSlug: 'cleaning',
    startingPrice: 95,
    rating: 4.9,
    reviewCount: 48,
    jobsCompleted: 38,
    avatarUrl: 'https://i.pravatar.cc/150?img=32',
  },
  {
    email: 'flyersup-review-demo-handyman@flyersup.app',
    firstName: 'Chris',
    lastName: 'Nguyen',
    displayName: 'Chris Nguyen',
    bio: 'Assembly, mounting, and small repairs — same-day when possible.',
    occupationSlug: 'handyman',
    categorySlug: 'handyman',
    serviceSlug: 'handyman',
    startingPrice: 85,
    rating: 4.85,
    reviewCount: 56,
    jobsCompleted: 42,
    avatarUrl: 'https://i.pravatar.cc/150?img=12',
  },
  {
    email: 'flyersup-review-demo-trainer@flyersup.app',
    firstName: 'Sam',
    lastName: 'Brooks',
    displayName: 'Sam Brooks',
    bio: 'Personal training and strength coaching — equipment-friendly sessions.',
    occupationSlug: 'personal-trainer',
    categorySlug: 'trainer-tutor',
    serviceSlug: 'trainer-tutor',
    startingPrice: 110,
    rating: 4.8,
    reviewCount: 31,
    jobsCompleted: 27,
    avatarUrl: 'https://i.pravatar.cc/150?img=59',
  },
  {
    email: 'flyersup-review-demo-photographer@flyersup.app',
    firstName: 'Alex',
    lastName: 'Rivera',
    displayName: 'Alex Rivera',
    bio: 'Portraits, events, and real-estate photography — fast turnaround on previews.',
    occupationSlug: 'photographer',
    categorySlug: 'photography',
    serviceSlug: 'photography',
    startingPrice: 175,
    rating: 4.95,
    reviewCount: 62,
    jobsCompleted: 51,
    avatarUrl: 'https://i.pravatar.cc/150?img=45',
  },
] as const;

function getServiceUrl(): string {
  const u = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!u?.trim()) {
    throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  }
  return u.trim();
}

function getServiceRole(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k?.trim()) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  return k.trim();
}

async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? '').toLowerCase() === normalized);
    if (hit?.id) return hit.id;
    if (users.length < 200) break;
  }
  return null;
}

async function ensureAuthUser(params: {
  admin: SupabaseClient;
  email: string;
  password: string;
  /** Supabase Auth app_metadata flag for ops (optional). */
  appMetadata?: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
}): Promise<string> {
  const { admin, email, password, appMetadata, userMetadata } = params;
  const existing = await findUserIdByEmail(admin, email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing, {
      email,
      password,
      email_confirm: true,
      app_metadata: appMetadata,
      user_metadata: userMetadata,
    });
    if (error) throw error;
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  });
  if (error) throw error;
  if (!data.user?.id) throw new Error(`createUser returned no id for ${email}`);
  return data.user.id;
}

/**
 * Apple Review Demo Mode (reviewer@flyersup.app only)
 * Seeds synthetic pros discoverable by `fetchAppReviewDemoServicePros` (email pattern `flyersup-review-demo-%`).
 */
async function ensureAppReviewDemoSupplyPros(admin: SupabaseClient): Promise<void> {
  const serviceSlugs = [...new Set(DEMO_SUPPLY_SPECS.map((s) => s.serviceSlug))];
  const categorySlugs = [...new Set(DEMO_SUPPLY_SPECS.map((s) => s.categorySlug))];
  const occupationSlugs = [...new Set(DEMO_SUPPLY_SPECS.map((s) => s.occupationSlug))];

  const { data: catRows, error: catQErr } = await admin
    .from('service_categories')
    .select('id, slug')
    .in('slug', categorySlugs);
  if (catQErr) throw catQErr;
  const catBySlug = new Map((catRows ?? []).map((r: { id: string; slug: string }) => [r.slug, r.id]));

  const { data: svcRows, error: svcQErr } = await admin.from('services').select('id, slug, is_active').in('slug', serviceSlugs);
  if (svcQErr) throw svcQErr;
  const svcBySlug = new Map(
    (svcRows ?? []).map((r: { id: string; slug: string; is_active?: boolean }) => [r.slug, r])
  );

  const { data: occRows, error: occQErr } = await admin.from('occupations').select('id, slug').in('slug', occupationSlugs);
  if (occQErr) throw occQErr;
  const occBySlug = new Map((occRows ?? []).map((r: { id: string; slug: string }) => [r.slug, r.id]));

  const nowIso = new Date().toISOString();

  for (const spec of DEMO_SUPPLY_SPECS) {
    const categoryId = catBySlug.get(spec.categorySlug);
    const svc = svcBySlug.get(spec.serviceSlug);
    const occupationId = occBySlug.get(spec.occupationSlug) ?? null;
    if (!categoryId) {
      console.warn(`[seed] Skipping demo pro ${spec.email}: no service_categories slug "${spec.categorySlug}"`);
      continue;
    }
    if (!svc?.id) {
      console.warn(`[seed] Skipping demo pro ${spec.email}: no services row for slug "${spec.serviceSlug}"`);
      continue;
    }
    if (svc.is_active === false) {
      console.warn(`[seed] Demo pro ${spec.email}: service "${spec.serviceSlug}" is inactive — marketplace merge may skip this service.`);
    }

    const uid = await ensureAuthUser({
      admin,
      email: spec.email,
      password: INTERNAL_DEMO_SUPPLY_PRO_PASSWORD,
      userMetadata: { role: 'pro' },
    });

    const { error: profErr } = await admin.from('profiles').upsert(
      {
        id: uid,
        email: spec.email,
        role: 'pro',
        first_name: spec.firstName,
        last_name: spec.lastName,
        full_name: `${spec.firstName} ${spec.lastName}`,
        zip_code: '10001',
        onboarding_step: null,
        account_status: 'active',
        avatar_url: spec.avatarUrl,
      },
      { onConflict: 'id' }
    );
    if (profErr) throw profErr;

    const { data: existingSp, error: spSelErr } = await admin
      .from('service_pros')
      .select('id')
      .eq('user_id', uid)
      .maybeSingle();
    if (spSelErr) throw spSelErr;

    const row = {
      user_id: uid,
      display_name: spec.displayName,
      bio: spec.bio,
      category_id: categoryId,
      primary_service_id: svc.id,
      occupation_id: occupationId,
      service_area_zip: '10001',
      starting_price: spec.startingPrice,
      rating: spec.rating,
      review_count: spec.reviewCount,
      jobs_completed: spec.jobsCompleted,
      location: 'New York, NY',
      available: true,
      same_day_available: true,
      service_radius: 50,
      business_hours: 'Demo — always available',
      years_experience: 6,
      services_offered: ['App Store review demo supply'],
      identity_verified: true,
      is_active_this_week: true,
      last_confirmed_available_at: nowIso,
    };

    let proRowId: string;
    if (existingSp?.id) {
      proRowId = existingSp.id as string;
      const { error: upErr } = await admin.from('service_pros').update(row).eq('id', proRowId);
      if (upErr) throw upErr;
    } else {
      const { data: ins, error: insErr } = await admin.from('service_pros').insert(row).select('id').single();
      if (insErr) throw insErr;
      proRowId = ins.id as string;
    }

    const { data: sub, error: subErr } = await admin
      .from('service_subcategories')
      .select('id')
      .eq('service_id', svc.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (subErr) throw subErr;

    await admin.from('pro_service_subcategories').delete().eq('pro_id', proRowId);
    if (sub?.id) {
      const { error: linkErr } = await admin.from('pro_service_subcategories').insert({
        pro_id: proRowId,
        subcategory_id: sub.id as string,
      });
      if (linkErr) throw linkErr;
    }
  }
}

async function main() {
  const url = getServiceUrl();
  const key = getServiceRole();
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: cat, error: catErr } = await admin
    .from('service_categories')
    .select('id, name')
    .limit(1)
    .maybeSingle();
  if (catErr) throw catErr;
  if (!cat?.id) {
    throw new Error('No service_categories row found. Seed categories before running this script.');
  }
  const categoryId = cat.id as string;

  const assignedProUserId = await ensureAuthUser({
    admin,
    email: DEMO_ASSIGNED_PRO_EMAIL,
    password: INTERNAL_ASSIGNED_PRO_PASSWORD,
    userMetadata: { role: 'pro' },
  });

  const reviewerUserId = await ensureAuthUser({
    admin,
    email: APPLE_APP_REVIEW_ACCOUNT_EMAIL,
    password: REVIEWER_PASSWORD,
    userMetadata: { role: 'customer' },
  });

  const now = DateTime.now().setZone(TZ);
  const upcomingDate = now.plus({ days: 12 }).toISODate()!;
  const completedDate = now.minus({ days: 18 }).toISODate()!;
  const incomingDate = now.plus({ days: 5 }).toISODate()!;

  // --- profiles ---
  const { error: pAssignedErr } = await admin.from('profiles').upsert(
    {
      id: assignedProUserId,
      email: DEMO_ASSIGNED_PRO_EMAIL,
      role: 'pro',
      /** Profile name used when this user appears as a booking customer (incoming demo). */
      first_name: 'Riley',
      last_name: 'Chen',
      full_name: 'Riley Chen',
      zip_code: '11201',
      onboarding_step: null,
      account_status: 'active',
    },
    { onConflict: 'id' }
  );
  if (pAssignedErr) throw pAssignedErr;

  const { error: pReviewErr } = await admin.from('profiles').upsert(
    {
      id: reviewerUserId,
      email: APPLE_APP_REVIEW_ACCOUNT_EMAIL,
      role: 'customer',
      first_name: 'App',
      last_name: 'Reviewer',
      full_name: 'App Reviewer',
      zip_code: '11201',
      onboarding_step: null,
      account_status: 'active',
    },
    { onConflict: 'id' }
  );
  if (pReviewErr) throw pReviewErr;

  // --- service pros: assigned pro (customer’s bookings) + reviewer’s pro profile (role switch) ---
  const { data: spAssigned, error: spAssignedSelErr } = await admin
    .from('service_pros')
    .select('id')
    .eq('user_id', assignedProUserId)
    .maybeSingle();
  if (spAssignedSelErr) throw spAssignedSelErr;

  let assignedProRowId: string;
  if (spAssigned?.id) {
    assignedProRowId = spAssigned.id as string;
    const { error: upErr } = await admin
      .from('service_pros')
      .update({
        display_name: 'Alex Martinez',
        bio: 'Licensed handyman — furniture assembly, TV mounting, and small repairs.',
        category_id: categoryId,
        service_area_zip: '11201',
        starting_price: 85,
        rating: 4.9,
        review_count: 52,
        location: 'Brooklyn, NY',
        available: true,
        service_radius: 15,
        business_hours: 'Mon–Sat 8am–6pm',
        years_experience: 8,
        services_offered: ['Assembly', 'Mounting', 'Minor repairs'],
      })
      .eq('id', assignedProRowId);
    if (upErr) throw upErr;
  } else {
    const { data: ins, error: insErr } = await admin
      .from('service_pros')
      .insert({
        user_id: assignedProUserId,
        display_name: 'Alex Martinez',
        bio: 'Licensed handyman — furniture assembly, TV mounting, and small repairs.',
        category_id: categoryId,
        service_area_zip: '11201',
        starting_price: 85,
        rating: 4.9,
        review_count: 52,
        location: 'Brooklyn, NY',
        available: true,
        service_radius: 15,
        business_hours: 'Mon–Sat 8am–6pm',
        years_experience: 8,
        services_offered: ['Assembly', 'Mounting', 'Minor repairs'],
      })
      .select('id')
      .single();
    if (insErr) throw insErr;
    assignedProRowId = ins.id as string;
  }

  const { data: spReview, error: spReviewSelErr } = await admin
    .from('service_pros')
    .select('id')
    .eq('user_id', reviewerUserId)
    .maybeSingle();
  if (spReviewSelErr) throw spReviewSelErr;

  let reviewerProRowId: string;
  if (spReview?.id) {
    reviewerProRowId = spReview.id as string;
    const { error: upRErr } = await admin
      .from('service_pros')
      .update({
        display_name: 'Jordan Lee',
        bio: 'Residential cleaning and organization — App Store review demo pro profile.',
        category_id: categoryId,
        service_area_zip: '11201',
        starting_price: 120,
        rating: 4.8,
        review_count: 34,
        location: 'Brooklyn, NY',
        available: true,
        service_radius: 20,
        business_hours: 'Mon–Sun 9am–7pm',
        years_experience: 5,
        services_offered: ['Deep clean', 'Move-out clean'],
      })
      .eq('id', reviewerProRowId);
    if (upRErr) throw upRErr;
  } else {
    const { data: insR, error: insRErr } = await admin
      .from('service_pros')
      .insert({
        user_id: reviewerUserId,
        display_name: 'Jordan Lee',
        bio: 'Residential cleaning and organization — App Store review demo pro profile.',
        category_id: categoryId,
        service_area_zip: '11201',
        starting_price: 120,
        rating: 4.8,
        review_count: 34,
        location: 'Brooklyn, NY',
        available: true,
        service_radius: 20,
        business_hours: 'Mon–Sun 9am–7pm',
        years_experience: 5,
        services_offered: ['Deep clean', 'Move-out clean'],
      })
      .select('id')
      .single();
    if (insRErr) throw insRErr;
    reviewerProRowId = insR.id as string;
  }

  await ensureAppReviewDemoSupplyPros(admin);

  // --- remove prior seed rows (idempotent) ---
  const { data: oldBookings, error: oldErr } = await admin
    .from('bookings')
    .select('id')
    .eq('notes', APPLE_APP_REVIEW_BOOKING_NOTES_MARKER);
  if (oldErr) throw oldErr;
  const oldIds = (oldBookings ?? []).map((r: { id: string }) => r.id).filter(Boolean);
  if (oldIds.length > 0) {
    await admin.from('booking_messages').delete().in('booking_id', oldIds);
    const { error: delErr } = await admin.from('bookings').delete().in('id', oldIds);
    if (delErr) throw delErr;
  }

  const marker = APPLE_APP_REVIEW_BOOKING_NOTES_MARKER;
  const common = {
    booking_timezone: TZ,
    notes: marker,
  };

  const { data: bUp, error: bUpErr } = await admin
    .from('bookings')
    .insert({
      ...common,
      customer_id: reviewerUserId,
      pro_id: assignedProRowId,
      service_date: upcomingDate,
      service_time: '09:00',
      address: '184 Kent Ave, Brooklyn, NY 11249',
      status: 'awaiting_deposit_payment',
      price: 245,
      customer_total_cents: 24500,
      subtotal_cents: 21000,
      payment_status: 'UNPAID',
    })
    .select('id')
    .single();
  if (bUpErr) throw bUpErr;

  const { data: bDone, error: bDoneErr } = await admin
    .from('bookings')
    .insert({
      ...common,
      customer_id: reviewerUserId,
      pro_id: assignedProRowId,
      service_date: completedDate,
      service_time: '10:30',
      address: '145 Frost St, Brooklyn, NY 11211',
      status: 'completed',
      price: 198,
      customer_total_cents: 19800,
      subtotal_cents: 17500,
      payment_status: 'PAID',
    })
    .select('id')
    .single();
  if (bDoneErr) throw bDoneErr;

  const { data: bIn, error: bInErr } = await admin
    .from('bookings')
    .insert({
      ...common,
      customer_id: assignedProUserId,
      pro_id: reviewerProRowId,
      service_date: incomingDate,
      service_time: '14:00',
      address: '88 Berry St, Brooklyn, NY 11249',
      status: 'deposit_paid',
      price: 165,
      customer_total_cents: 16500,
      subtotal_cents: 14500,
      payment_status: 'PAID',
    })
    .select('id')
    .single();
  if (bInErr) throw bInErr;

  const { error: msgErr } = await admin.from('booking_messages').insert({
    booking_id: bUp.id as string,
    sender_id: assignedProUserId,
    sender_role: 'pro',
    message:
      'Hi! I have your furniture assembly scheduled. I will bring tools and a floor mat. Reply here if you need to adjust the building access code.',
  });
  if (msgErr) throw msgErr;

  console.log(`Apple App Review seed complete.
- Reviewer: ${APPLE_APP_REVIEW_ACCOUNT_EMAIL} / ${REVIEWER_PASSWORD} (sign in at /signin with Email + password; do not use OTP for this inbox)
- Customer bookings: upcoming ${bUp.id}, completed ${bDone.id}
- Pro “Incoming” demo (after role switch to Pro): ${bIn.id}
- Internal assigned-pro auth (not for Apple): ${DEMO_ASSIGNED_PRO_EMAIL}
- Demo marketplace supply (emails flyersup-review-demo-*@flyersup.app): Cleaner, Handyman, Trainer/Tutor, Photographer
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
