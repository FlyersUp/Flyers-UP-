import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';

export type ProWorkPhoto =
  | {
      id: string;
      imageUrl: string;
      tags: string[];
      createdAt: string | null;
      jobTitle: string | null;
      beforeUrl?: undefined;
      afterUrl?: undefined;
    }
  | {
      id: string;
      beforeUrl: string;
      afterUrl: string;
      tags: string[];
      createdAt: string | null;
      jobTitle: string | null;
      imageUrl?: undefined;
    };

export type ProCredential = {
  type: 'credential';
  label: string;
  verified: boolean;
  updatedAt: string | null;
  url?: string | null;
};

export type ProReview = {
  rating: number;
  text: string;
  createdAt: string;
  reviewerFirstName: string;
  jobTitle: string | null;
  verifiedBooking: boolean;
};

export type PublicProProfileModel = {
  id: string; // service_pros.id
  userId: string; // profiles.id
  businessName: string;
  avatarUrl: string | null;
  logoUrl: string | null;
  phone: string | null;
  phonePublic: boolean;
  categoryName: string | null;
  locationLabel: string | null;
  serviceRadiusMiles: number | null;
  bio: string | null;
  aboutLong: string | null;
  yearsActive: number | null;
  businessHours: string | null;
  stats: {
    jobsCompleted: number | null;
    avgRating: number | null;
    reviewCount: number | null;
    responseTimeMedian: string | null;
  };
  photos: ProWorkPhoto[];
  services: Array<{ name: string; startingFromPrice: number | null; durationRange: string | null }>;
  credentials: ProCredential[];
  reviews: ProReview[];
};

export type CustomerPublicModel = {
  id: string;
  firstName: string;
  avatarUrl: string | null;
  memberSince: string | null;
  stats: {
    jobsCompleted: number | null;
    avgRatingFromPros: number | null;
    paymentReliabilityPct: number | null;
    cancellationRatePct: number | null;
  };
  houseRules: string | null;
  preferredContactMethod: string | null;
};

function isDev() {
  return process.env.NODE_ENV === 'development';
}

function safeText(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length ? v : null;
}

function parsePhotos(raw: unknown): ProWorkPhoto[] {
  if (!Array.isArray(raw)) return [];
  const out: ProWorkPhoto[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) {
      out.push({
        id: `photo_${out.length}`,
        imageUrl: item.trim(),
        tags: [],
        createdAt: null,
        jobTitle: null,
      });
      continue;
    }
    if (item && typeof item === 'object') {
      const any = item as any;
      const beforeUrl = safeText(any.before_url ?? any.beforeUrl);
      const afterUrl = safeText(any.after_url ?? any.afterUrl);
      const imageUrl = safeText(any.image_url ?? any.imageUrl);
      const tags = Array.isArray(any.tags) ? any.tags.filter((t: any) => typeof t === 'string') : [];
      const createdAt = safeText(any.created_at ?? any.createdAt);
      const jobTitle = safeText(any.job_title ?? any.jobTitle);
      if (beforeUrl && afterUrl) {
        out.push({
          id: String(any.id ?? `photo_${out.length}`),
          beforeUrl,
          afterUrl,
          tags,
          createdAt,
          jobTitle,
        });
        continue;
      }
      if (imageUrl) {
        out.push({
          id: String(any.id ?? `photo_${out.length}`),
          imageUrl,
          tags,
          createdAt,
          jobTitle,
        });
      }
    }
  }
  return out;
}

function parseCredentials(raw: unknown): ProCredential[] {
  if (!Array.isArray(raw)) return [];
  const out: ProCredential[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const any = item as any;
    const label = safeText(any.label ?? any.name);
    if (!label) continue;
    out.push({
      type: 'credential',
      label,
      verified: Boolean(any.verified_bool ?? any.verified ?? false),
      updatedAt: safeText(any.updated_at ?? any.updatedAt),
      url: safeText(any.url),
    });
  }
  return out;
}

export async function getPublicProProfileByIdServer(proId: string): Promise<PublicProProfileModel | null> {
  const admin = createAdminSupabaseClient();

  const { data: pro, error: proErr } = await admin
    .from('service_pros')
    .select(
      'id, user_id, display_name, bio, category_id, location, service_radius, years_experience, rating, review_count, available, business_hours, logo_url, service_descriptions, before_after_photos, services_offered, certifications, created_at'
    )
    .eq('id', proId)
    .maybeSingle();

  if (proErr) {
    console.error('getPublicProProfileByIdServer service_pros error:', proErr);
    return null;
  }
  if (!pro) return null;
  if ((pro as any).available === false) return null;

  const userId = String((pro as any).user_id);

  const [{ data: prof }, { data: cat }, { count: jobsCompletedCount }] = await Promise.all([
    admin.from('profiles').select('id, phone, avatar_url').eq('id', userId).maybeSingle(),
    admin.from('service_categories').select('name').eq('id', (pro as any).category_id).maybeSingle(),
    admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('pro_id', String((pro as any).id))
      .eq('status', 'completed'),
  ]);

  const businessName = safeText((pro as any).display_name) ?? 'Service Pro';
  const locationLabel = safeText((pro as any).location) ?? safeText((pro as any).service_area_zip) ?? null;
  const photos = parsePhotos((pro as any).before_after_photos);
  const servicesRaw: string[] = Array.isArray((pro as any).services_offered)
    ? ((pro as any).services_offered as any[]).filter((v) => typeof v === 'string')
    : [];
  const services = servicesRaw.map((name) => ({ name, startingFromPrice: null, durationRange: null }));

  // Phone privacy: column not yet in schema -> default false.
  // When you add a `phone_public` column to `service_pros`, set this from DB.
  const phonePublic = false;

  const model: PublicProProfileModel = {
    id: String((pro as any).id),
    userId,
    businessName,
    avatarUrl: safeText((prof as any)?.avatar_url),
    logoUrl: safeText((pro as any).logo_url),
    phone: safeText((prof as any)?.phone),
    phonePublic,
    categoryName: safeText((cat as any)?.name),
    locationLabel,
    serviceRadiusMiles: typeof (pro as any).service_radius === 'number' ? (pro as any).service_radius : null,
    bio: safeText((pro as any).bio),
    aboutLong: safeText((pro as any).service_descriptions),
    yearsActive: typeof (pro as any).years_experience === 'number' ? (pro as any).years_experience : null,
    businessHours: safeText((pro as any).business_hours),
    stats: {
      jobsCompleted: typeof jobsCompletedCount === 'number' ? jobsCompletedCount : null,
      avgRating: typeof (pro as any).rating === 'number' ? Number((pro as any).rating) : null,
      reviewCount: typeof (pro as any).review_count === 'number' ? Number((pro as any).review_count) : null,
      responseTimeMedian: null,
    },
    photos,
    services,
    credentials: parseCredentials((pro as any).certifications),
    reviews: [],
  };

  if (isDev()) {
    // Dev-only fallback so local UI work isn't blocked by empty DB.
    if (!model.photos.length) {
      model.photos = [
        {
          id: 'dev_1',
          imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=60',
          tags: ['Deep clean'],
          createdAt: null,
          jobTitle: 'Deep Clean',
        },
        {
          id: 'dev_2',
          beforeUrl: 'https://images.unsplash.com/photo-1581579184688-3c60b72e40a8?auto=format&fit=crop&w=800&q=60',
          afterUrl: 'https://images.unsplash.com/photo-1581579184683-9d95c8576812?auto=format&fit=crop&w=800&q=60',
          tags: ['Before/After'],
          createdAt: null,
          jobTitle: 'Move-out refresh',
        },
      ];
    }
    if (!model.services.length) {
      model.services = [
        { name: 'Standard cleaning', startingFromPrice: null, durationRange: '2–3 hours' },
        { name: 'Deep cleaning', startingFromPrice: null, durationRange: '3–5 hours' },
        { name: 'Move-out / Move-in', startingFromPrice: null, durationRange: null },
      ];
    }
  }

  return model;
}

export async function getCustomerPrivateAccountDataServer() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, reason: 'signed_out' as const };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, first_name, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || (profile as any).role !== 'customer') {
    return { ok: false as const, reason: 'not_customer' as const };
  }

  return {
    ok: true as const,
    userId: user.id,
    firstName: safeText((profile as any).first_name) ?? 'Account',
    avatarUrl: safeText((profile as any).avatar_url),
    createdAt: safeText((profile as any).created_at),
  };
}

