/**
 * API Functions for Flyers Up
 * 
 * This file contains all data fetching and mutation functions using Supabase.
 * It replaces the old mockApi.ts file.
 * 
 * All functions are typed and handle errors gracefully.
 * 
 * FUTURE IMPROVEMENTS:
 * - Add caching with React Query or SWR
 * - Add optimistic updates for better UX
 * - Add more granular error handling
 * - Add admin role checks for admin operations
 */

import { supabase } from './supabaseClient';
import type { UserRole, BookingStatus } from '@/types/database';

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function isLikelyNetworkError(err: unknown): boolean {
  // Browser fetch failures often surface as TypeError("Failed to fetch").
  if (!(err instanceof Error)) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('load failed')
  );
}

// ============================================
// TYPES (matching the old mockApi interface)
// ============================================

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
  error?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface ServicePro {
  id: string;
  userId: string;
  name: string;
  bio: string;
  categorySlug: string;
  categoryName: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  location: string;
  available: boolean;
}

export interface PublicProProfile extends ServicePro {
  businessHours: string | null;
  yearsExperience: number | null;
  servicesOffered: string[];
  serviceTypes: Array<{ name: string; price: string; id?: string }>;
  logoUrl: string | null;
  serviceDescriptions: string | null;
  serviceAreaZip: string | null;
  serviceRadius: number | null;
  beforeAfterPhotos: string[];
}

export interface ScopeReview {
  id: string;
  bookingId: string;
  requestedBy: string;
  reason: string;
  status: 'open' | 'resolved' | 'rejected';
  createdAt: string;
}

export interface BookingDetails {
  id: string;
  customerId: string;
  proId: string;
  serviceDate: string;
  serviceTime: string;
  address: string;
  notes: string | null;
  status: BookingStatus;
  price: number | null;
  createdAt: string;
  proName?: string;
  proUserId?: string;
}

// Status history entry for tracking booking lifecycle
export interface StatusHistoryEntry {
  status: string;
  at: string; // ISO timestamp
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  proId: string;
  proName: string;
  category: string;
  date: string;
  time: string;
  address: string;
  notes: string;
  status: BookingStatus;
  price?: number;
  createdAt: string;
  /**
   * Timeline of status changes for this booking.
   * Each entry records when the status changed.
   * 
   * FUTURE: Could include additional metadata like:
   * - Who made the change (pro/customer/system)
   * - Notes or reasons for status change
   * - Location data when job was completed
   */
  statusHistory?: StatusHistoryEntry[];
}

export interface CreateBookingPayload {
  customerId: string;
  proId: string;
  date: string;
  time: string;
  address: string;
  notes: string;
  selectedAddonIds?: string[]; // Optional array of add-on IDs to snapshot
}

export interface EarningsSummary {
  totalEarnings: number;
  thisMonth: number;
  completedJobs: number;
  pendingPayments: number;
}

// ============================================
// ADD-ON TYPES
// ============================================

/**
 * Service add-on: optional flat-price add-on that pros can offer per category.
 * Max 4 active add-ons per pro per service category.
 */
export interface ServiceAddon {
  id: string;
  proId: string;
  serviceCategory: string; // Category slug (e.g., 'cleaning', 'plumbing')
  title: string;
  priceCents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Booking add-on snapshot: immutable record of add-on selected at booking time.
 * 
 * IMPORTANT: These snapshots preserve the exact title and price at booking creation,
 * regardless of future changes to service_addons. This ensures pricing integrity
 * and prevents disputes over price changes.
 */
export interface BookingAddonSnapshot {
  id: string;
  bookingId: string;
  addonId: string;
  titleSnapshot: string; // Snapshot of title at booking time
  priceSnapshotCents: number; // Snapshot of price at booking time
  createdAt: string;
}

export interface UserWithProfile {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  avatarUrl?: string | null;
}

// ============================================
// AUTH FUNCTIONS
// ============================================

/**
 * Sign up a new user with email and password.
 * Creates both an auth user and a profile row.
 * If role is 'pro', also creates a service_pros row.
 */
export async function signUp(
  role: 'customer' | 'pro',
  email: string,
  password: string
): Promise<AuthResponse> {
  if (!SUPABASE_CONFIGURED) {
    return {
      success: false,
      error:
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel Environment Variables, then redeploy.',
    };
  }

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role, // Store role in user metadata
        },
      },
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user' };
    }

    // 2. Create profile row (best-effort).
    // IMPORTANT: Supabase email-confirm flows often return `session: null` here,
    // meaning there is no authenticated context to satisfy RLS insert policies.
    // In that case, we skip profile creation and rely on first-login/onboarding
    // (`getCurrentUser` / `getOrCreateProfile`) to create the row.
    if (authData.session) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: authData.user.email ?? email,
        role,
        full_name: email.split('@')[0],
        onboarding_step: role === 'pro' ? 'pro_profile' : 'customer_profile',
      });

      if (profileError) {
        console.warn('Profile creation warning (signup):', {
          message: (profileError as any)?.message,
          details: (profileError as any)?.details,
          hint: (profileError as any)?.hint,
          code: (profileError as any)?.code,
          status: (profileError as any)?.status,
        });
      }
    }

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        role,
      },
    };
  } catch (err) {
    console.error('Signup error:', err);
    if (isLikelyNetworkError(err)) {
      return {
        success: false,
        error:
          'Network error reaching Supabase. If you’re in Yemen (or on a restricted ISP), try a VPN or a different network.',
      };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Sign in an existing user with email and password.
 * Returns the user with their profile role.
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  if (!SUPABASE_CONFIGURED) {
    return {
      success: false,
      error:
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel Environment Variables, then redeploy.',
    };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Auth signin error:', authError);
      // Give a clearer hint when the account likely uses OTP/magic-link auth.
      const msg = authError.message || 'Unable to sign in';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        return {
          success: false,
          error:
            'Incorrect email or password. If you usually sign in via email code, use “Continue with Email” on the /auth page instead.',
        };
      }
      return { success: false, error: msg };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to sign in' };
    }

    // Fetch the user's profile to get their role.
    // Use maybeSingle so "no row" doesn't become a hard error that blocks login.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle();

    const metadataRoleRaw = authData.user.user_metadata?.role;
    const metadataRole: 'customer' | 'pro' | null =
      metadataRoleRaw === 'customer' || metadataRoleRaw === 'pro' ? metadataRoleRaw : null;

    if (profileError) {
      // If RLS blocks profile reads, don't block sign-in; route will be handled by guards/onboarding.
      console.error('Profile fetch error:', profileError);
    }

    // Best-effort ensure a profile row exists (role may be null to force role selection).
    if (!profile) {
      try {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          email: authData.user.email ?? null,
          role: metadataRole,
          full_name: authData.user.email ? authData.user.email.split('@')[0] : null,
          onboarding_step: metadataRole ? (metadataRole === 'pro' ? 'pro_profile' : 'customer_profile') : 'role',
        });
      } catch (e) {
        // ignore
      }
    }

    // If role is missing, default to customer; downstream guards will route to /onboarding/role.
    const resolvedRole = (profile?.role as UserRole | null) ?? (metadataRole as UserRole | null) ?? ('customer' as UserRole);

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        role: resolvedRole,
      },
    };
  } catch (err) {
    console.error('Signin error:', err);
    if (isLikelyNetworkError(err)) {
      return {
        success: false,
        error:
          'Network error reaching Supabase. If you’re in Yemen (or on a restricted ISP), try a VPN or a different network.',
      };
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  await supabase.auth.signOut();
}

/**
 * Get the currently authenticated user with their profile.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<UserWithProfile | null> {
  if (!SUPABASE_CONFIGURED) return null;
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('getCurrentUser profile fetch error:', profileError);
      return null;
    }

    // User exists but no profile row yet (common right after OTP auth, or if a previous
    // signup partially succeeded). Attempt to create the minimal row and retry.
    if (!profile) {
      const roleFromMetadata = (user.user_metadata?.role as UserRole | undefined) ?? null;
      const fullNameFromMetadata = (user.user_metadata?.full_name as string | undefined) ?? null;

      const { error: insertError } = await supabase.from('profiles').insert({
        id: user.id,
        email: user.email ?? null,
        role: roleFromMetadata,
        full_name: fullNameFromMetadata ?? (user.email ? user.email.split('@')[0] : null),
        onboarding_step: roleFromMetadata ? (roleFromMetadata === 'pro' ? 'pro_profile' : 'customer_profile') : 'role',
      });

      if (insertError) {
        console.error('getCurrentUser profile insert error:', insertError);
        return null;
      }

      const retry = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (retry.error) {
        console.error('getCurrentUser profile retry fetch error:', retry.error);
        return null;
      }
      if (!retry.data) return null;

      return {
        id: user.id,
        email: user.email!,
        role: retry.data.role as UserRole,
        fullName: retry.data.full_name,
        avatarUrl: retry.data.avatar_url ?? null,
      };
    }

    return {
      id: user.id,
      email: user.email!,
      role: profile.role as UserRole,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url ?? null,
    };
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return null;
  }
}

/**
 * Listen to auth state changes.
 * Useful for updating UI when user signs in/out.
 */
export function onAuthStateChange(
  callback: (user: UserWithProfile | null) => void
) {
  if (!SUPABASE_CONFIGURED) {
    return { data: { subscription: { unsubscribe() {} } } };
  }
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await getCurrentUser();
      callback(user);
    } else {
      callback(null);
    }
  });
}

// ============================================
// SERVICE CATEGORIES
// ============================================

/**
 * Get service categories.
 *
 * Default behavior is PUBLIC categories only (is_public = true) when the column exists.
 * This keeps dormant lanes (e.g. hoarding) hidden from normal browsing.
 */
export async function getServiceCategories(options?: { includeHidden?: boolean }): Promise<ServiceCategory[]> {
  const includeHidden = Boolean(options?.includeHidden);

  // Prefer filtering by is_public (added via migration). If the column doesn't exist yet,
  // fall back to the old query so the app doesn't hard-fail.
  const baseQuery = supabase.from('service_categories').select('*').order('name');
  const { data, error } = includeHidden ? await baseQuery : await baseQuery.eq('is_public', true);

  if (error) {
    // If the is_public column isn't present yet, retry without the filter.
    if (!includeHidden && /is_public/i.test(error.message)) {
      const retry = await supabase.from('service_categories').select('*').order('name');
      if (retry.error) {
        console.error('Error fetching categories (retry):', retry.error);
        return [];
      }
      return retry.data.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        icon: cat.icon || '📦',
      }));
    }

    console.error('Error fetching categories:', error);
    return [];
  }

  // If the column exists but no rows are marked public yet, fall back to showing categories
  // so pros can still complete onboarding and save their business profile.
  if (!includeHidden && (data?.length ?? 0) === 0) {
    const retry = await supabase.from('service_categories').select('*').order('name');
    if (retry.error) {
      console.error('Error fetching categories (empty public fallback):', retry.error);
      return [];
    }
    return retry.data.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || '📦',
    }));
  }

  return data.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description || '',
    icon: cat.icon || '📦',
  }));
}

/**
 * Fetch a single category by slug.
 * Use includeHidden=true for gated lanes (e.g. /book?category=hoarding).
 */
export async function getCategoryBySlug(
  slug: string,
  options?: { includeHidden?: boolean }
): Promise<ServiceCategory | null> {
  const includeHidden = Boolean(options?.includeHidden);
  const baseQuery = supabase.from('service_categories').select('*').eq('slug', slug).limit(1);
  const { data, error } = includeHidden ? await baseQuery : await baseQuery.eq('is_public', true);

  if (error) {
    if (!includeHidden && /is_public/i.test(error.message)) {
      const retry = await supabase.from('service_categories').select('*').eq('slug', slug).limit(1);
      if (retry.error) {
        console.error('Error fetching category by slug (retry):', retry.error);
        return null;
      }
      const row = retry.data?.[0];
      return row
        ? { id: row.id, name: row.name, slug: row.slug, description: row.description || '', icon: row.icon || '📦' }
        : null;
    }
    console.error('Error fetching category by slug:', error);
    return null;
  }

  const row = data?.[0];
  return row
    ? { id: row.id, name: row.name, slug: row.slug, description: row.description || '', icon: row.icon || '📦' }
    : null;
}

// ============================================
// SERVICE PROS
// ============================================

/**
 * Get service pros by category slug.
 */
export async function getProsByCategory(categorySlug: string): Promise<ServicePro[]> {
  // Default limit prevents unbounded reads as the marketplace scales.
  // Add pagination UI when expanding beyond this.
  const limit = 24;
  const offset = 0;

  const { data, error } = await supabase
    .from('service_pros')
    .select(`
      *,
      service_categories!inner (
        slug,
        name
      )
    `)
    .eq('service_categories.slug', categorySlug)
    .eq('available', true)
    .order('rating', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching pros by category:', error);
    return [];
  }

  return data.map(pro => ({
    id: pro.id,
    userId: pro.user_id,
    name: pro.display_name,
    bio: pro.bio || '',
    categorySlug: pro.service_categories.slug,
    categoryName: pro.service_categories.name,
    rating: pro.rating,
    reviewCount: pro.review_count,
    startingPrice: pro.starting_price,
    location: pro.location || 'Not specified',
    available: pro.available,
  }));
}

/**
 * Get a single service pro by ID.
 */
export async function getProById(proId: string): Promise<ServicePro | null> {
  const { data, error } = await supabase
    .from('service_pros')
    .select(`
      *,
      service_categories (
        slug,
        name
      )
    `)
    .eq('id', proId)
    .single();

  if (error) {
    console.error('Error fetching pro by ID:', error);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.display_name,
    bio: data.bio || '',
    categorySlug: data.service_categories.slug,
    categoryName: data.service_categories.name,
    rating: data.rating,
    reviewCount: data.review_count,
    startingPrice: data.starting_price,
    location: data.location || 'Not specified',
    available: data.available,
  };
}

/**
 * Public pro profile fields for customer browsing.
 * This is the "listing" customers use to evaluate and request a job.
 */
export async function getPublicProProfileById(proId: string): Promise<PublicProProfile | null> {
  const { data, error } = await supabase
    .from('service_pros')
    .select(
      `
      *,
      service_categories (
        slug,
        name
      )
    `
    )
    .eq('id', proId)
    .single();

  if (error) {
    console.error('Error fetching public pro profile by ID:', error);
    return null;
  }

  const serviceTypes: Array<{ name: string; price: string; id?: string }> = Array.isArray((data as any).service_types)
    ? ((data as any).service_types as any[]).filter((s) => s && typeof s.name === 'string' && typeof s.price === 'string')
    : [];

  const servicesOffered: string[] = Array.isArray((data as any).services_offered)
    ? ((data as any).services_offered as any[]).filter((v) => typeof v === 'string')
    : [];

  const photos: string[] = Array.isArray((data as any).before_after_photos)
    ? ((data as any).before_after_photos as any[]).filter((v) => typeof v === 'string')
    : [];

  return {
    id: data.id,
    userId: data.user_id,
    name: data.display_name,
    bio: data.bio || '',
    categorySlug: (data as any).service_categories?.slug || 'general',
    categoryName: (data as any).service_categories?.name || 'General',
    rating: data.rating,
    reviewCount: data.review_count,
    startingPrice: data.starting_price,
    location: data.location || 'Not specified',
    available: data.available,
    businessHours: (data as any).business_hours ?? null,
    yearsExperience: (data as any).years_experience ?? null,
    servicesOffered,
    serviceTypes,
    logoUrl: (data as any).logo_url ?? null,
    serviceDescriptions: (data as any).service_descriptions ?? null,
    serviceAreaZip: (data as any).service_area_zip ?? null,
    serviceRadius: (data as any).service_radius ?? null,
    beforeAfterPhotos: photos,
  };
}

/**
 * Hoarding lane (dormant): list only pros who opted in.
 * This should only be used when category=hoarding is explicitly requested.
 */
export async function getHoardingPros(): Promise<ServicePro[]> {
  const limit = 24;
  const offset = 0;

  const { data, error } = await supabase
    .from('service_pros')
    .select(
      `
      *,
      service_categories (
        slug,
        name
      )
    `
    )
    .eq('accepts_hoarding_jobs', true)
    .eq('available', true)
    .order('rating', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching hoarding pros:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((pro: any) => ({
    id: pro.id,
    userId: pro.user_id,
    name: pro.display_name,
    bio: pro.bio || '',
    categorySlug: pro.service_categories?.slug || 'general',
    categoryName: pro.service_categories?.name || 'General',
    rating: pro.rating,
    reviewCount: pro.review_count,
    startingPrice: pro.starting_price,
    location: pro.location || 'Not specified',
    available: pro.available,
  }));
}

/**
 * Get service pro by user ID (for pro dashboard).
 */
export async function getProByUserId(userId: string): Promise<ServicePro | null> {
  const { data, error } = await supabase
    .from('service_pros')
    .select(`
      *,
      service_categories (
        slug,
        name
      )
    `)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching pro by user ID:', error);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.display_name,
    bio: data.bio || '',
    categorySlug: data.service_categories.slug,
    categoryName: data.service_categories.name,
    rating: data.rating,
    reviewCount: data.review_count,
    startingPrice: data.starting_price,
    location: data.location || 'Not specified',
    available: data.available,
  };
}

// ============================================
// BOOKINGS
// ============================================

/**
 * Get a single booking (job) by ID.
 * RLS ensures only booking participants can read it.
 */
export async function getBookingById(bookingId: string): Promise<BookingDetails | null> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(
        `
        *,
        service_pros (
          id,
          display_name,
          user_id
        )
      `
      )
      .eq('id', bookingId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      customerId: data.customer_id,
      proId: data.pro_id,
      serviceDate: data.service_date,
      serviceTime: data.service_time,
      address: data.address,
      notes: data.notes || null,
      status: data.status as BookingStatus,
      price: data.price ?? null,
      createdAt: data.created_at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      proName: (data.service_pros as any)?.display_name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      proUserId: (data.service_pros as any)?.user_id,
    };
  } catch {
    return null;
  }
}

/**
 * Get all bookings for a customer.
 */
export async function getCustomerBookings(customerId: string): Promise<Booking[]> {
  // Default limit prevents the realtime hook from re-fetching an ever-growing list.
  const limit = 50;
  const offset = 0;

  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // If Supabase is not configured, return mock data (UI-only mode)
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return mock bookings for UI development
    return [
      {
        id: '1',
        customerId,
        customerName: 'You',
        proId: '1',
        proName: 'Sarah Johnson',
        category: 'cleaning',
        date: '2024-01-15',
        time: '10:00 AM',
        address: '123 Main St, Apt 4B',
        notes: 'Please focus on the kitchen',
        status: 'scheduled' as BookingStatus,
        price: 150,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        customerId,
        customerName: 'You',
        proId: '2',
        proName: 'Mike Chen',
        category: 'plumbing',
        date: '2024-01-20',
        time: '2:00 PM',
        address: '456 Oak Ave',
        notes: '',
        status: 'pending' as BookingStatus,
        price: 120,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service_pros!inner (
          display_name,
          service_categories (
            slug,
            name
          )
        )
      `)
      .eq('customer_id', customerId)
      .order('service_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      // Only log error if Supabase is configured (not expected errors)
      // Suppress errors when Supabase is not available (UI-only mode)
      return [];
    }

    // Get customer profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', customerId)
      .single();

    return data.map(booking => ({
      id: booking.id,
      customerId: booking.customer_id,
      customerName: profile?.full_name || 'Customer',
      proId: booking.pro_id,
      proName: booking.service_pros.display_name,
      category: booking.service_pros.service_categories.slug,
      date: booking.service_date,
      time: booking.service_time,
      address: booking.address,
      notes: booking.notes || '',
      status: booking.status as BookingStatus,
      price: booking.price || undefined,
      createdAt: booking.created_at,
      statusHistory: booking.status_history as StatusHistoryEntry[] | undefined,
    }));
  } catch (err) {
    // Suppress errors when Supabase is not configured (expected in UI-only mode)
    // Only log if Supabase was supposed to be available
    if (supabaseUrl && supabaseAnonKey) {
      console.error('Unexpected error fetching customer bookings:', err);
    }
    return [];
  }
}

/**
 * Get all jobs (bookings) for a service pro.
 */
export async function getProJobs(proUserId: string): Promise<Booking[]> {
  const limit = 50;
  const offset = 0;

  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    // Supabase not configured - return empty array for UI-only mode
    return [];
  }

  try {
    // First get the pro's service_pros.id from their user_id
    const { data: proData, error: proError } = await supabase
      .from('service_pros')
      .select('id, category_id, service_categories(slug)')
      .eq('user_id', proUserId)
      .single();

    if (proError || !proData) {
      // Only log error if it has a message property (meaningful error) and Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (proError && supabaseUrl && supabaseAnonKey && proError.message) {
        console.error('Error fetching pro data:', proError);
      }
      return [];
    }

    // Extract category slug from the joined data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryData = proData.service_categories as any;
    const categorySlug = categoryData?.slug || 'general';

    // Then get bookings for that pro
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles!bookings_customer_id_fkey (
          full_name
        )
      `)
      .eq('pro_id', proData.id)
      .order('service_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      // Only log error if it has meaningful content
      if (Object.keys(error).length > 0) {
        console.error('Error fetching pro jobs:', error);
      }
      return [];
    }

    // Get pro's display name
    const { data: proProfile } = await supabase
      .from('service_pros')
      .select('display_name')
      .eq('id', proData.id)
      .single();

    return data.map(booking => ({
      id: booking.id,
      customerId: booking.customer_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customerName: (booking.profiles as any)?.full_name || 'Customer',
      proId: booking.pro_id,
      proName: proProfile?.display_name || 'Service Pro',
      category: categorySlug,
      date: booking.service_date,
      time: booking.service_time,
      address: booking.address,
      notes: booking.notes || '',
      status: booking.status as BookingStatus,
      price: booking.price || undefined,
      createdAt: booking.created_at,
      statusHistory: booking.status_history as StatusHistoryEntry[] | undefined,
    }));
  } catch (err) {
    // Supabase not available - return empty array for UI-only mode
    return [];
  }
}

/**
 * Get earnings summary for a service pro.
 */
export async function getProEarnings(proUserId: string): Promise<EarningsSummary> {
  // Prefer RPC aggregation to avoid pulling all rows client-side as data grows.
  // The RPC ignores the provided proUserId and always uses auth.uid() server-side.
  // We keep the parameter for API compatibility with existing callers.
  try {
    const { data, error } = await supabase.rpc('get_my_pro_earnings_summary');
    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return { totalEarnings: 0, thisMonth: 0, completedJobs: 0, pendingPayments: 0 };
    }

    const row = data[0] as {
      total_earnings: number | string | null;
      this_month: number | string | null;
      completed_jobs: number | null;
      pending_payments: number | string | null;
    };

    return {
      totalEarnings: Number(row.total_earnings ?? 0),
      thisMonth: Number(row.this_month ?? 0),
      completedJobs: Number(row.completed_jobs ?? 0),
      pendingPayments: Number(row.pending_payments ?? 0),
    };
  } catch {
    return { totalEarnings: 0, thisMonth: 0, completedJobs: 0, pendingPayments: 0 };
  }
}

/**
 * Create a new booking request.
 */
/**
 * Create a new booking request with optional add-ons.
 * 
 * IMPORTANT: Add-ons are SNAPSHOTTED at booking creation time. This means:
 * - We fetch the current title and price from service_addons
 * - We store immutable copies in booking_addons
 * - Future changes to service_addons won't affect this booking
 * - Total price is calculated server-side from snapshots + base price
 */
export async function createBooking(payload: CreateBookingPayload): Promise<Booking | null> {
  // Initialize status_history with the 'requested' entry
  const initialStatusHistory: StatusHistoryEntry[] = [
    { status: 'requested', at: new Date().toISOString() }
  ];

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      customer_id: payload.customerId,
      pro_id: payload.proId,
      service_date: payload.date,
      service_time: payload.time,
      address: payload.address,
      notes: payload.notes || null,
      status: 'requested',
      status_history: initialStatusHistory,
    })
    .select(`
      *,
      service_pros!inner (
        display_name,
        service_categories (
          slug
        )
      )
    `)
    .single();

  if (error) {
    console.error('Error creating booking:', error);
    throw new Error(error.message);
  }

  // Snapshot selected add-ons if any
  if (payload.selectedAddonIds && payload.selectedAddonIds.length > 0) {
    // Fetch current add-on data to snapshot
    const { data: addonsData, error: addonsError } = await supabase
      .from('service_addons')
      .select('id, title, price_cents')
      .in('id', payload.selectedAddonIds);

    if (addonsError) {
      console.error('Error fetching add-ons for snapshot:', addonsError);
      // Continue without add-ons rather than failing the booking
    } else if (addonsData && addonsData.length > 0) {
      // Create snapshots
      const snapshots = addonsData.map(addon => ({
        booking_id: data.id,
        addon_id: addon.id,
        title_snapshot: addon.title,
        price_snapshot_cents: addon.price_cents,
      }));

      const { error: snapshotError } = await supabase
        .from('booking_addons')
        .insert(snapshots);

      if (snapshotError) {
        console.error('Error creating add-on snapshots:', snapshotError);
        // Continue without add-ons rather than failing the booking
      }
    }
  }

  // Get customer name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', payload.customerId)
    .single();

  return {
    id: data.id,
    customerId: data.customer_id,
    customerName: profile?.full_name || 'Customer',
    proId: data.pro_id,
    proName: data.service_pros.display_name,
    category: data.service_pros.service_categories.slug,
    date: data.service_date,
    time: data.service_time,
    address: data.address,
    notes: data.notes || '',
    status: data.status as BookingStatus,
    createdAt: data.created_at,
    statusHistory: data.status_history as StatusHistoryEntry[] | undefined,
  };
}

// ============================================
// STATUS UPDATE TYPES
// ============================================

export type JobStatusAction =
  | 'accepted'
  | 'declined'
  | 'awaiting_payment'
  | 'completed'
  | 'cancelled';

export interface UpdateBookingStatusParams {
  bookingId: string;
  newStatus: JobStatusAction;
  proUserId: string;
}

export interface UpdateBookingStatusResult {
  success: boolean;
  error?: string;
  booking?: Booking;
}

// Valid status transitions
const VALID_TRANSITIONS: Record<string, JobStatusAction[]> = {
  requested: ['accepted', 'declined'],
  // Model C: pro marks work complete => awaiting_payment, then payment => completed.
  // Keep 'completed' allowed for backwards compatibility (older flows).
  accepted: ['awaiting_payment', 'completed', 'cancelled'],
  // Terminal states - no further transitions allowed
  awaiting_payment: [],
  completed: [],
  cancelled: [],
  declined: [],
};

/**
 * Update booking status with validation and earnings creation.
 * 
 * This function:
 * 1. Validates that the pro owns the booking
 * 2. Validates the status transition is allowed
 * 3. Updates the booking status
 * 4. Creates earnings record on completion (placeholder logic)
 * 
 * @param params - The update parameters
 * @returns Result object with success status and optional error/booking
 * 
 * FUTURE IMPROVEMENTS:
 * - Add cancellation window logic (e.g., can't cancel within 24 hours)
 * - Add penalty logic for late cancellations
 * - Add notification triggers
 * - Replace placeholder earnings with real pricing logic
 */
export async function updateBookingStatus(
  params: UpdateBookingStatusParams
): Promise<UpdateBookingStatusResult>;

// Overload for backwards compatibility with old signature
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  price?: number
): Promise<boolean>;

// Implementation
export async function updateBookingStatus(
  paramsOrBookingId: UpdateBookingStatusParams | string,
  statusOrUndefined?: BookingStatus,
  price?: number
): Promise<UpdateBookingStatusResult | boolean> {
  // Handle backwards compatibility with old signature
  if (typeof paramsOrBookingId === 'string') {
    const bookingId = paramsOrBookingId;
    const status = statusOrUndefined!;
    
    const updateData: { status: string; price?: number } = { status };
    if (price !== undefined) {
      updateData.price = price;
    }

    const { error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId);

    if (error) {
      console.error('Error updating booking status:', error);
      return false;
    }

    return true;
  }

  // New implementation with full validation
  const { bookingId, newStatus, proUserId } = paramsOrBookingId;

  try {
    // 1. Get the pro's service_pros record
    const { data: proData, error: proError } = await supabase
      .from('service_pros')
      .select('id, starting_price')
      .eq('user_id', proUserId)
      .single();

    if (proError || !proData) {
      return {
        success: false,
        error: 'Pro profile not found. Please complete your profile setup.',
      };
    }

    const proId = proData.id;

    // 2. Get the current booking and verify ownership
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('pro_id', proId) // Ensure this booking belongs to this pro
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: 'Booking not found or you do not have permission to update it.',
      };
    }

    // 3. Validate status transition
    const currentStatus = booking.status;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      return {
        success: false,
        error: `Cannot change status from "${currentStatus}" to "${newStatus}". Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`,
      };
    }

    // 4. Update status_history array
    // Fetch current status_history (or default to empty array)
    const currentHistory: StatusHistoryEntry[] = booking.status_history || [];
    const newHistoryEntry: StatusHistoryEntry = {
      status: newStatus,
      at: new Date().toISOString(),
    };
    const updatedHistory = [...currentHistory, newHistoryEntry];

    // 5. Update the booking status and status_history
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: newStatus,
        status_history: updatedHistory,
      })
      .eq('id', bookingId)
      .eq('pro_id', proId) // Double-check ownership in update
      .select()
      .single();

    if (updateError) {
      console.error('Error updating booking status:', updateError);
      return {
        success: false,
        error: 'Failed to update booking status. Please try again.',
      };
    }

    // 6. If completed, create earnings record
    if (newStatus === 'completed') {
      await createEarningsForBooking(proId, bookingId, proData.starting_price);
    }

    // 7. Return success with minimal booking data
    return {
      success: true,
      booking: {
        id: updatedBooking.id,
        customerId: updatedBooking.customer_id,
        customerName: '', // Not fetched in this context
        proId: updatedBooking.pro_id,
        proName: '', // Not fetched in this context
        category: '', // Not fetched in this context
        date: updatedBooking.service_date,
        time: updatedBooking.service_time,
        address: updatedBooking.address,
        notes: updatedBooking.notes || '',
        status: updatedBooking.status as BookingStatus,
        price: updatedBooking.price || undefined,
        createdAt: updatedBooking.created_at,
        statusHistory: updatedBooking.status_history as StatusHistoryEntry[] | undefined,
      },
    };
  } catch (err) {
    console.error('Unexpected error updating booking status:', err);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Create an earnings record for a completed booking.
 * 
 * PLACEHOLDER LOGIC: Currently uses a simple calculation:
 * - If booking has a price set, use that
 * - Otherwise, use the pro's starting_price as a base
 * - Minimum earnings: $50
 * 
 * FUTURE: Replace with real pricing logic that considers:
 * - Actual service duration
 * - Service type pricing
 * - Platform fees
 * - Promotions/discounts
 * - Tips
 */
async function createEarningsForBooking(
  proId: string,
  bookingId: string,
  startingPrice: number
): Promise<void> {
  // Check if earnings already exist for this booking (idempotency)
  const { data: existingEarnings } = await supabase
    .from('pro_earnings')
    .select('id')
    .eq('booking_id', bookingId)
    .single();

  if (existingEarnings) {
    console.log('Earnings already exist for booking:', bookingId);
    return;
  }

  // Get the booking price if set
  const { data: booking } = await supabase
    .from('bookings')
    .select('price')
    .eq('id', bookingId)
    .single();

  // PLACEHOLDER PRICING LOGIC
  // TODO: Replace with real pricing calculation based on:
  // - Service type and duration
  // - Customer-agreed price
  // - Platform fee deduction
  let amount = booking?.price || startingPrice || 50;
  
  // Ensure minimum earnings (placeholder business rule)
  amount = Math.max(amount, 50);

  // Insert earnings record
  const { error: earningsError } = await supabase
    .from('pro_earnings')
    .insert({
      pro_id: proId,
      booking_id: bookingId,
      amount,
    });

  if (earningsError) {
    // Log but don't fail the status update
    // Earnings can be reconciled later if needed
    console.error('Failed to create earnings record:', earningsError);
  } else {
    console.log('Created earnings record:', { proId, bookingId, amount });
  }
}

// ============================================
// SETTINGS FUNCTIONS
// ============================================

/**
 * Update user profile (full_name, phone).
 */
export interface UpdateProfileParams {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

export async function updateProfile(params: UpdateProfileParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: params.full_name,
        phone: params.phone,
        avatar_url: params.avatar_url,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating profile:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ============================================
// NEW SETTINGS ENTITIES (Addresses + Preferences)
// ============================================

export type UserAddress = {
  id: string;
  userId: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  entryNotes: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listUserAddresses(userId: string): Promise<UserAddress[]> {
  const { data, error } = await supabase
    .from('user_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('Error fetching addresses:', error);
    return [];
  }
  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    label: row.label,
    line1: row.line1,
    line2: row.line2 ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    postalCode: row.postal_code ?? null,
    entryNotes: row.entry_notes ?? null,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function upsertUserAddress(
  userId: string,
  address: Partial<UserAddress> & { line1: string; label?: string }
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const payload: any = {
      user_id: userId,
      label: address.label ?? 'home',
      line1: address.line1,
      line2: address.line2 ?? null,
      city: address.city ?? null,
      state: address.state ?? null,
      postal_code: address.postalCode ?? null,
      entry_notes: address.entryNotes ?? null,
      is_default: Boolean(address.isDefault),
      updated_at: new Date().toISOString(),
    };

    if (address.id) payload.id = address.id;

    const { data, error } = await supabase
      .from('user_addresses')
      .upsert(payload, { onConflict: 'id' })
      .select('id')
      .single();

    if (error) {
      console.error('Error upserting address:', error);
      return { success: false, error: error.message };
    }

    // If this address is default, clear others.
    if (payload.is_default && data?.id) {
      await supabase
        .from('user_addresses')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .neq('id', data.id);
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Unexpected error upserting address:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteUserAddress(userId: string, addressId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('user_id', userId)
      .eq('id', addressId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Unexpected error deleting address:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export type UserBookingPreferences = {
  preferredServiceSlugs: string[];
  favoriteProIds: string[];
  priceMin: number | null;
  priceMax: number | null;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  rebookLastPro: boolean;
};

export async function getUserBookingPreferences(userId: string): Promise<UserBookingPreferences> {
  const { data, error } = await supabase.from('user_booking_preferences').select('*').eq('user_id', userId).single();
  if (error) {
    // If missing row, return defaults
    return {
      preferredServiceSlugs: [],
      favoriteProIds: [],
      priceMin: null,
      priceMax: null,
      timeWindowStart: null,
      timeWindowEnd: null,
      rebookLastPro: false,
    };
  }
  return {
    preferredServiceSlugs: data.preferred_service_slugs || [],
    favoriteProIds: (data.favorite_pro_ids || []).map((x: any) => String(x)),
    priceMin: data.price_min ?? null,
    priceMax: data.price_max ?? null,
    timeWindowStart: data.time_window_start ?? null,
    timeWindowEnd: data.time_window_end ?? null,
    rebookLastPro: Boolean(data.rebook_last_pro),
  };
}

export async function updateUserBookingPreferences(
  userId: string,
  prefs: Partial<UserBookingPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {
      user_id: userId,
      preferred_service_slugs: prefs.preferredServiceSlugs,
      favorite_pro_ids: prefs.favoriteProIds,
      price_min: prefs.priceMin,
      price_max: prefs.priceMax,
      time_window_start: prefs.timeWindowStart,
      time_window_end: prefs.timeWindowEnd,
      rebook_last_pro: prefs.rebookLastPro,
      updated_at: new Date().toISOString(),
    };
    // Remove undefined so partial updates don't null fields
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    const { error } = await supabase.from('user_booking_preferences').upsert(payload, { onConflict: 'user_id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating booking prefs:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export type UserSafetyPreferences = {
  noContactService: boolean;
  petPresent: boolean;
  genderPreference: 'no_preference' | 'male' | 'female' | 'other';
};

export async function getUserSafetyPreferences(userId: string): Promise<UserSafetyPreferences> {
  const { data, error } = await supabase.from('user_safety_preferences').select('*').eq('user_id', userId).single();
  if (error) {
    return { noContactService: false, petPresent: false, genderPreference: 'no_preference' };
  }
  return {
    noContactService: Boolean(data.no_contact_service),
    petPresent: Boolean(data.pet_present),
    genderPreference: (data.gender_preference || 'no_preference') as any,
  };
}

export async function updateUserSafetyPreferences(
  userId: string,
  prefs: Partial<UserSafetyPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {
      user_id: userId,
      no_contact_service: prefs.noContactService,
      pet_present: prefs.petPresent,
      gender_preference: prefs.genderPreference,
      updated_at: new Date().toISOString(),
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const { error } = await supabase.from('user_safety_preferences').upsert(payload, { onConflict: 'user_id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating safety prefs:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export type UserAppPreferences = {
  darkMode: boolean;
  distanceUnits: 'miles' | 'km';
  defaultMapView: 'map' | 'list';
  locationEnabled: boolean;
};

export async function getUserAppPreferences(userId: string): Promise<UserAppPreferences> {
  const { data, error } = await supabase.from('user_app_preferences').select('*').eq('user_id', userId).single();
  if (error) {
    return { darkMode: false, distanceUnits: 'miles', defaultMapView: 'map', locationEnabled: true };
  }
  return {
    darkMode: Boolean(data.dark_mode),
    distanceUnits: (data.distance_units || 'miles') as any,
    defaultMapView: (data.default_map_view || 'map') as any,
    locationEnabled: Boolean(data.location_enabled),
  };
}

export async function updateUserAppPreferences(
  userId: string,
  prefs: Partial<UserAppPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {
      user_id: userId,
      dark_mode: prefs.darkMode,
      distance_units: prefs.distanceUnits,
      default_map_view: prefs.defaultMapView,
      location_enabled: prefs.locationEnabled,
      updated_at: new Date().toISOString(),
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const { error } = await supabase.from('user_app_preferences').upsert(payload, { onConflict: 'user_id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating app prefs:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getUserShieldPlusEnabled(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('user_shield_preferences').select('*').eq('user_id', userId).single();
  if (error) return true;
  return Boolean(data.shield_plus_enabled);
}

export async function setUserShieldPlusEnabled(
  userId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_shield_preferences')
      .upsert({ user_id: userId, shield_plus_enabled: enabled, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating shield prefs:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export type ProShieldSettings = { shieldPlusEnabled: boolean; holdbackPercent: number };

export async function getProShieldSettings(userId: string): Promise<ProShieldSettings> {
  const { data, error } = await supabase.from('pro_shield_settings').select('*').eq('pro_user_id', userId).single();
  if (error) return { shieldPlusEnabled: true, holdbackPercent: 0 };
  return {
    shieldPlusEnabled: Boolean(data.shield_plus_enabled),
    holdbackPercent: Number(data.holdback_percent || 0),
  };
}

export async function updateProShieldSettings(
  userId: string,
  settings: Partial<ProShieldSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {
      pro_user_id: userId,
      shield_plus_enabled: settings.shieldPlusEnabled,
      holdback_percent: settings.holdbackPercent,
      updated_at: new Date().toISOString(),
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const { error } = await supabase.from('pro_shield_settings').upsert(payload, { onConflict: 'pro_user_id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating pro shield settings:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export type ProPricingSettings = {
  hourlyPricing: boolean;
  minimumJobPrice: number | null;
  travelFeeEnabled: boolean;
  aiPriceSuggestions: boolean;
};

export async function getProPricingSettings(userId: string): Promise<ProPricingSettings> {
  const { data, error } = await supabase.from('pro_pricing_settings').select('*').eq('pro_user_id', userId).single();
  if (error) {
    return { hourlyPricing: false, minimumJobPrice: null, travelFeeEnabled: false, aiPriceSuggestions: false };
  }
  return {
    hourlyPricing: Boolean(data.hourly_pricing),
    minimumJobPrice: data.minimum_job_price ?? null,
    travelFeeEnabled: Boolean(data.travel_fee_enabled),
    aiPriceSuggestions: Boolean(data.ai_price_suggestions),
  };
}

export async function updateProPricingSettings(
  userId: string,
  settings: Partial<ProPricingSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {
      pro_user_id: userId,
      hourly_pricing: settings.hourlyPricing,
      minimum_job_price: settings.minimumJobPrice,
      travel_fee_enabled: settings.travelFeeEnabled,
      ai_price_suggestions: settings.aiPriceSuggestions,
      updated_at: new Date().toISOString(),
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const { error } = await supabase.from('pro_pricing_settings').upsert(payload, { onConflict: 'pro_user_id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating pro pricing settings:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ============================================
// SCOPE REVIEWS
// ============================================

export async function createScopeReview(
  bookingId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'You must be signed in.' };
  if (!reason.trim()) return { success: false, error: 'Please enter a reason.' };

  const { error } = await supabase.from('scope_reviews').insert({
    booking_id: bookingId,
    requested_by: user.id,
    reason: reason.trim(),
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getLatestScopeReview(bookingId: string): Promise<ScopeReview | null> {
  const { data, error } = await supabase
    .from('scope_reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) return null;
  const row = data?.[0];
  if (!row) return null;

  return {
    id: row.id,
    bookingId: row.booking_id,
    requestedBy: row.requested_by,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
  };
}

/**
 * Change user email (Supabase auth).
 */
export async function changeEmail(newEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      console.error('Error changing email:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Unexpected error changing email:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Change user password (Supabase auth).
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First verify old password by attempting to sign in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (signInError) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      console.error('Error updating password:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error changing password:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get service pro profile by user ID (for business settings).
 */
export interface ServiceProProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  categoryId: string;
  categoryName: string;
  startingPrice: number;
  serviceRadius: number | null;
  businessHours: string | null;
  yearsExperience: number | null;
  verifiedCredentials: string[];
  servicesOffered: string[];
  serviceTypes: Array<{ name: string; price: string; id?: string }>;
}

export async function getMyServicePro(userId: string): Promise<ServiceProProfile | null> {
  try {
    const { data, error } = await supabase
      .from('service_pros')
      .select(`
        *,
        service_categories (
          name
        )
      `)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('Error fetching service pro:', error);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      displayName: data.display_name,
      bio: data.bio,
      categoryId: data.category_id,
      categoryName: (data.service_categories as { name?: string } | null)?.name || 'Unknown',
      startingPrice: data.starting_price,
      serviceRadius: data.service_radius,
      businessHours: data.business_hours,
      yearsExperience: (data as any).years_experience ?? null,
      verifiedCredentials: Array.isArray((data as any).certifications)
        ? ((data as any).certifications as unknown[]).filter((v) => typeof v === 'string') as string[]
        : [],
      servicesOffered: Array.isArray((data as any).services_offered)
        ? ((data as any).services_offered as unknown[]).filter((v) => typeof v === 'string') as string[]
        : [],
      serviceTypes: (() => {
        const raw = (data as any).service_types;
        if (!Array.isArray(raw)) return [];
        return (raw as any[])
          .filter(
            (s) =>
              s &&
              typeof s.name === 'string' &&
              (typeof s.price === 'string' || typeof s.price === 'number')
          )
          .map((s) => ({
            name: String(s.name),
            price: String(s.price),
            id: typeof s.id === 'string' ? s.id : undefined,
          }));
      })(),
    };
  } catch (err) {
    console.error('Unexpected error fetching service pro:', err);
    return null;
  }
}

/**
 * Update service pro profile (business settings).
 */
export interface UpdateServiceProParams {
  display_name?: string;
  bio?: string;
  category_id?: string;
  starting_price?: number;
  service_radius?: number;
  business_hours?: string;
  location?: string;
  yearsExperience?: number;
  verifiedCredentials?: string[];
  servicesOffered?: string[];
  availabilityTime?: string;
  logo_url?: string;
  years_experience?: number;
  before_after_photos?: unknown[];
  service_descriptions?: string;
  service_area_zip?: string;
  services_offered?: string[];
  certifications?: unknown[];
  service_types?: unknown[];
}

export async function updateServicePro(
  userId: string,
  params: UpdateServiceProParams
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the pro's service_pros.id from user_id
    const { data: proData, error: proError } = await supabase
      .from('service_pros')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (proError || !proData) {
      return { success: false, error: 'Service pro profile not found' };
    }

    const updateData: Partial<{
      display_name: string;
      bio: string;
      category_id: string;
      starting_price: number;
      service_radius: number;
      business_hours: string;
      location: string;
      logo_url: string;
      years_experience: number;
      before_after_photos: unknown;
      service_descriptions: string;
      service_area_zip: string;
      services_offered: string[];
      certifications: unknown;
    }> = {};
    if (params.display_name !== undefined) updateData.display_name = params.display_name;
    if (params.bio !== undefined) updateData.bio = params.bio;
    if (params.category_id !== undefined) updateData.category_id = params.category_id;
    if (params.starting_price !== undefined) updateData.starting_price = params.starting_price;
    if (params.service_radius !== undefined) updateData.service_radius = params.service_radius;
    if (params.business_hours !== undefined) updateData.business_hours = params.business_hours;
    if (params.location !== undefined) updateData.location = params.location;
    if (params.logo_url !== undefined) updateData.logo_url = params.logo_url;
    if (params.years_experience !== undefined) updateData.years_experience = params.years_experience;
    if (params.before_after_photos !== undefined) updateData.before_after_photos = params.before_after_photos;
    if (params.service_descriptions !== undefined) updateData.service_descriptions = params.service_descriptions;
    if (params.service_area_zip !== undefined) updateData.service_area_zip = params.service_area_zip;
    if (params.services_offered !== undefined) updateData.services_offered = params.services_offered;
    if (params.certifications !== undefined) updateData.certifications = params.certifications;

    const { error } = await supabase
      .from('service_pros')
      .update(updateData)
      .eq('id', proData.id);

    if (error) {
      console.error('Error updating service pro:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating service pro:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get notification settings for a user.
 */
export interface NotificationSettings {
  new_booking: boolean;
  job_status_updates: boolean;
  messages: boolean;
  marketing_emails: boolean;
}

export type NotificationDelivery = { email: boolean; push: boolean };
export type NotificationAlerts = Record<string, boolean>;

export type NotificationSettingsV2 = NotificationSettings & {
  delivery: NotificationDelivery;
  alerts: NotificationAlerts;
};

export async function getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
  try {
    const { data, error } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no settings exist, return defaults
      if (error.code === 'PGRST116') {
        return {
          new_booking: true,
          job_status_updates: true,
          messages: true,
          marketing_emails: false,
        };
      }
      console.error('Error fetching notification settings:', error);
      return null;
    }

    return {
      new_booking: data.new_booking,
      job_status_updates: data.job_status_updates,
      messages: data.messages,
      marketing_emails: data.marketing_emails,
    };
  } catch (err) {
    console.error('Unexpected error fetching notification settings:', err);
    return null;
  }
}

export async function getNotificationSettingsV2(userId: string): Promise<NotificationSettingsV2> {
  const fallback: NotificationSettingsV2 = {
    new_booking: true,
    job_status_updates: true,
    messages: true,
    marketing_emails: false,
    delivery: { email: true, push: true },
    alerts: {},
  };

  try {
    const { data, error } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Missing row => defaults
      return fallback;
    }

    const delivery = (data.delivery || {}) as any;
    const alerts = (data.alerts || {}) as any;

    return {
      new_booking: Boolean(data.new_booking),
      job_status_updates: Boolean(data.job_status_updates),
      messages: Boolean(data.messages),
      marketing_emails: Boolean(data.marketing_emails),
      delivery: {
        email: delivery.email !== undefined ? Boolean(delivery.email) : true,
        push: delivery.push !== undefined ? Boolean(delivery.push) : true,
      },
      alerts: typeof alerts === 'object' && alerts ? alerts : {},
    };
  } catch (err) {
    console.error('Unexpected error fetching notification settings v2:', err);
    return fallback;
  }
}

/**
 * Update notification settings for a user.
 */
export async function updateNotificationSettings(
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if settings exist
    const { data: existing } = await supabase
      .from('user_notification_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('user_notification_settings')
        .update(settings)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating notification settings:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('user_notification_settings')
        .insert({
          user_id: userId,
          ...settings,
        });

      if (error) {
        console.error('Error creating notification settings:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating notification settings:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateNotificationSettingsV2(
  userId: string,
  input: {
    delivery?: Partial<NotificationDelivery>;
    alerts?: NotificationAlerts;
    legacy?: Partial<NotificationSettings>;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Read existing so we can merge delivery without clobbering keys.
    const existing = await getNotificationSettingsV2(userId);
    const mergedDelivery: NotificationDelivery = {
      email: input.delivery?.email ?? existing.delivery.email,
      push: input.delivery?.push ?? existing.delivery.push,
    };
    const mergedAlerts: NotificationAlerts = input.alerts ? { ...existing.alerts, ...input.alerts } : existing.alerts;

    const update: any = {
      ...(input.legacy || {}),
      delivery: mergedDelivery,
      alerts: mergedAlerts,
      updated_at: new Date().toISOString(),
    };

    const { data: row, error: selectErr } = await supabase
      .from('user_notification_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (selectErr || !row) {
      const { error } = await supabase.from('user_notification_settings').insert({
        user_id: userId,
        ...existing,
        ...(input.legacy || {}),
        delivery: mergedDelivery,
        alerts: mergedAlerts,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const { error } = await supabase.from('user_notification_settings').update(update).eq('user_id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating notification settings v2:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get payout method for a pro.
 */
export interface PayoutMethod {
  method: 'bank_account' | 'paypal' | 'cashapp';
  account_last4: string | null;
}

export async function getPayoutMethod(userId: string): Promise<PayoutMethod | null> {
  try {
    const { data, error } = await supabase
      .from('pro_payout_accounts')
      .select('method, account_last4')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No payout method set yet
        return null;
      }
      console.error('Error fetching payout method:', error);
      return null;
    }

    return {
      method: data.method as 'bank_account' | 'paypal' | 'cashapp',
      account_last4: data.account_last4,
    };
  } catch (err) {
    console.error('Unexpected error fetching payout method:', err);
    return null;
  }
}

/**
 * Update payout method for a pro.
 */
export async function updatePayoutMethod(
  userId: string,
  method: 'bank_account' | 'paypal' | 'cashapp',
  accountLast4: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if payout account exists
    const { data: existing } = await supabase
      .from('pro_payout_accounts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('pro_payout_accounts')
        .update({
          method,
          account_last4: accountLast4,
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating payout method:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('pro_payout_accounts')
        .insert({
          user_id: userId,
          method,
          account_last4: accountLast4,
        });

      if (error) {
        console.error('Error creating payout method:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating payout method:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update language preference.
 */
export async function updateLanguage(userId: string, language: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ language_preference: language })
      .eq('id', userId);

    if (error) {
      console.error('Error updating language:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating language:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ============================================
// PRO: PAYOUT PREFERENCES
// ============================================

export type ProPayoutPreferences = {
  payoutSchedule: 'instant' | 'weekly';
  showFeeBreakdown: boolean;
  showEscrowHoldback: boolean;
};

export async function getProPayoutPreferences(userId: string): Promise<ProPayoutPreferences> {
  // Default shape
  const fallback: ProPayoutPreferences = {
    payoutSchedule: 'weekly',
    showFeeBreakdown: true,
    showEscrowHoldback: true,
  };

  try {
    const { data, error } = await supabase
      .from('pro_payout_preferences')
      .select('*')
      .eq('pro_user_id', userId)
      .single();

    if (error || !data) return fallback;
    return {
      payoutSchedule: (data.payout_schedule as 'instant' | 'weekly') || 'weekly',
      showFeeBreakdown: Boolean(data.show_fee_breakdown),
      showEscrowHoldback: Boolean(data.show_escrow_holdback),
    };
  } catch {
    return fallback;
  }
}

export async function updateProPayoutPreferences(
  userId: string,
  prefs: Partial<ProPayoutPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: Record<string, unknown> = { pro_user_id: userId };
    if (prefs.payoutSchedule !== undefined) payload.payout_schedule = prefs.payoutSchedule;
    if (prefs.showFeeBreakdown !== undefined) payload.show_fee_breakdown = prefs.showFeeBreakdown;
    if (prefs.showEscrowHoldback !== undefined) payload.show_escrow_holdback = prefs.showEscrowHoldback;

    const { error } = await supabase.from('pro_payout_preferences').upsert(payload, { onConflict: 'pro_user_id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating pro payout preferences:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ============================================
// PRO: SAFETY & COMPLIANCE SETTINGS
// ============================================

export type ProSafetyComplianceSettings = {
  guidelinesAcknowledged: boolean;
  insuranceDocumentUrl: string;
};

export async function getProSafetyComplianceSettings(userId: string): Promise<ProSafetyComplianceSettings> {
  const fallback: ProSafetyComplianceSettings = { guidelinesAcknowledged: false, insuranceDocumentUrl: '' };
  try {
    const { data, error } = await supabase
      .from('pro_safety_compliance_settings')
      .select('*')
      .eq('pro_user_id', userId)
      .single();
    if (error || !data) return fallback;
    return {
      guidelinesAcknowledged: Boolean(data.guidelines_acknowledged),
      insuranceDocumentUrl: data.insurance_document_url || '',
    };
  } catch {
    return fallback;
  }
}

export async function updateProSafetyComplianceSettings(
  userId: string,
  settings: Partial<ProSafetyComplianceSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: Record<string, unknown> = { pro_user_id: userId };
    if (settings.guidelinesAcknowledged !== undefined) payload.guidelines_acknowledged = settings.guidelinesAcknowledged;
    if (settings.insuranceDocumentUrl !== undefined) payload.insurance_document_url = settings.insuranceDocumentUrl;

    const { error } = await supabase
      .from('pro_safety_compliance_settings')
      .upsert(payload, { onConflict: 'pro_user_id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating safety compliance settings:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ============================================
// CUSTOMER: PAYMENT METHODS (DISPLAY-ONLY)
// ============================================

export type UserPaymentMethod = {
  id: string;
  type: 'card' | 'apple_pay' | 'google_pay';
  label: string;
  brand: string;
  last4: string;
  isDefault: boolean;
};

export async function listUserPaymentMethods(userId: string): Promise<UserPaymentMethod[]> {
  try {
    const { data, error } = await supabase
      .from('user_payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error || !data) return [];

    return (data as any[]).map((r) => ({
      id: r.id,
      type: r.type,
      label: r.label || '',
      brand: r.brand || '',
      last4: r.last4 || '',
      isDefault: Boolean(r.is_default),
    }));
  } catch {
    return [];
  }
}

export async function upsertUserPaymentMethod(
  userId: string,
  method: Omit<UserPaymentMethod, 'id' | 'isDefault'> & { id?: string; isDefault?: boolean }
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const payload: Record<string, unknown> = {
      user_id: userId,
      type: method.type,
      label: method.label || null,
      brand: method.brand || null,
      last4: method.last4 || null,
      is_default: Boolean(method.isDefault),
    };
    if (method.id) payload.id = method.id;

    const { data, error } = await supabase.from('user_payment_methods').upsert(payload).select('id').single();
    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Unexpected error upserting user payment method:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteUserPaymentMethod(
  userId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('user_payment_methods').delete().eq('user_id', userId).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Unexpected error deleting user payment method:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function setDefaultUserPaymentMethod(
  userId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Unset existing default
    await supabase.from('user_payment_methods').update({ is_default: false }).eq('user_id', userId);
    // Set new default
    const { error } = await supabase.from('user_payment_methods').update({ is_default: true }).eq('user_id', userId).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error('Unexpected error setting default payment method:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ============================================
// SERVICE ADD-ONS
// ============================================

/**
 * Get all add-ons for a pro (both active and inactive).
 * Used in pro dashboard for management.
 */
export async function getProAddons(proUserId: string, serviceCategory?: string): Promise<ServiceAddon[]> {
  try {
    // Get the pro's profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', proUserId)
      .single();

    if (!profile) {
      return [];
    }

    let query = supabase
      .from('service_addons')
      .select('*')
      .eq('pro_id', profile.id)
      .order('created_at', { ascending: false });

    if (serviceCategory) {
      query = query.eq('service_category', serviceCategory);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pro add-ons:', error);
      return [];
    }

    return (data || []).map(addon => ({
      id: addon.id,
      proId: addon.pro_id,
      serviceCategory: addon.service_category,
      title: addon.title,
      priceCents: addon.price_cents,
      isActive: addon.is_active,
      createdAt: addon.created_at,
      updatedAt: addon.updated_at,
    }));
  } catch (err) {
    console.error('Unexpected error fetching pro add-ons:', err);
    return [];
  }
}

/**
 * Get active add-ons for a pro and category.
 * Used in customer checkout to display available add-ons.
 */
export async function getActiveAddonsForPro(proId: string, serviceCategory: string): Promise<ServiceAddon[]> {
  try {
    // Get the pro's profile ID from service_pros
    const { data: proData } = await supabase
      .from('service_pros')
      .select('user_id')
      .eq('id', proId)
      .single();

    if (!proData) {
      return [];
    }

    const { data, error } = await supabase
      .from('service_addons')
      .select('*')
      .eq('pro_id', proData.user_id)
      .eq('service_category', serviceCategory)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching active add-ons:', error);
      return [];
    }

    return (data || []).map(addon => ({
      id: addon.id,
      proId: addon.pro_id,
      serviceCategory: addon.service_category,
      title: addon.title,
      priceCents: addon.price_cents,
      isActive: addon.is_active,
      createdAt: addon.created_at,
      updatedAt: addon.updated_at,
    }));
  } catch (err) {
    console.error('Unexpected error fetching active add-ons:', err);
    return [];
  }
}

/**
 * Create a new add-on for a pro.
 * Enforces max 4 active add-ons per category (enforced by DB trigger).
 */
export async function createAddon(
  proUserId: string,
  serviceCategory: string,
  title: string,
  priceCents: number
): Promise<{ success: boolean; addon?: ServiceAddon; error?: string }> {
  try {
    // Get the pro's profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', proUserId)
      .single();

    if (!profile) {
      return { success: false, error: 'Pro profile not found' };
    }

    const { data, error } = await supabase
      .from('service_addons')
      .insert({
        pro_id: profile.id,
        service_category: serviceCategory,
        title,
        price_cents: priceCents,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      // Check if error is about max active add-ons
      if (error.message.includes('Maximum 4 active add-ons')) {
        return { success: false, error: 'Maximum 4 active add-ons allowed per service category' };
      }
      console.error('Error creating add-on:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      addon: {
        id: data.id,
        proId: data.pro_id,
        serviceCategory: data.service_category,
        title: data.title,
        priceCents: data.price_cents,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err) {
    console.error('Unexpected error creating add-on:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update an add-on (title, price, or active status).
 * Enforces max 4 active add-ons per category when activating.
 */
export async function updateAddon(
  addonId: string,
  updates: {
    title?: string;
    priceCents?: number;
    isActive?: boolean;
  }
): Promise<{ success: boolean; addon?: ServiceAddon; error?: string }> {
  try {
    const updateData: Partial<{ title: string; price_cents: number; is_active: boolean }> = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.priceCents !== undefined) updateData.price_cents = updates.priceCents;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('service_addons')
      .update(updateData)
      .eq('id', addonId)
      .select()
      .single();

    if (error) {
      // Check if error is about max active add-ons
      if (error.message.includes('Maximum 4 active add-ons')) {
        return { success: false, error: 'Maximum 4 active add-ons allowed per service category' };
      }
      console.error('Error updating add-on:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      addon: {
        id: data.id,
        proId: data.pro_id,
        serviceCategory: data.service_category,
        title: data.title,
        priceCents: data.price_cents,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err) {
    console.error('Unexpected error updating add-on:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete an add-on.
 */
export async function deleteAddon(addonId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('service_addons')
      .delete()
      .eq('id', addonId);

    if (error) {
      console.error('Error deleting add-on:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error deleting add-on:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get add-on snapshots for a booking.
 */
export async function getBookingAddons(bookingId: string): Promise<BookingAddonSnapshot[]> {
  try {
    const { data, error } = await supabase
      .from('booking_addons')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching booking add-ons:', error);
      return [];
    }

    return (data || []).map(snapshot => ({
      id: snapshot.id,
      bookingId: snapshot.booking_id,
      addonId: snapshot.addon_id,
      titleSnapshot: snapshot.title_snapshot,
      priceSnapshotCents: snapshot.price_snapshot_cents,
      createdAt: snapshot.created_at,
    }));
  } catch (err) {
    console.error('Unexpected error fetching booking add-ons:', err);
    return [];
  }
}

// ============================================
// SETTINGS (continued)
// ============================================

/**
 * Deactivate account (placeholder - no hard deletion).
 */
export async function deactivateAccount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // PLACEHOLDER: In production, you might:
    // - Set a deactivated_at timestamp
    // - Soft delete by updating a status field
    // - Send a confirmation email
    // - Schedule actual deletion after a grace period
    
    // For now, just return success
    console.log('Account deactivation requested for user:', userId);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error deactivating account:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

