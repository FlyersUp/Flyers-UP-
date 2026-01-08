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

    // 2. Create profile row
    // Note: In production, you might want to use a database trigger
    // or the service role key to create the profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        role,
        full_name: email.split('@')[0], // Use email prefix as initial name
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // User created but profile failed - this is a partial failure
      // The profile might need to be created on first login
    }

    // 3. If pro, get the first category and create a service_pros row
    if (role === 'pro') {
      const { data: categories } = await supabase
        .from('service_categories')
        .select('id')
        .limit(1)
        .single();

      if (categories) {
        const { error: proError } = await supabase
          .from('service_pros')
          .insert({
            user_id: authData.user.id,
            display_name: email.split('@')[0],
            bio: 'New service professional - update your profile!',
            category_id: categories.id,
            starting_price: 0,
            rating: 0,
            review_count: 0,
            location: 'Not set',
            available: false,
          });

        if (proError) {
          console.error('Pro profile creation error:', proError);
        }
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
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to sign in' };
    }

    // Fetch the user's profile to get their role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // If no profile exists, try to create one from user metadata
      const metadataRole = authData.user.user_metadata?.role as UserRole | undefined;
      if (metadataRole) {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          role: metadataRole,
          full_name: email.split('@')[0],
        });
        return {
          success: true,
          user: {
            id: authData.user.id,
            email: authData.user.email!,
            role: metadataRole,
          },
        };
      }
      return { success: false, error: 'Profile not found' };
    }

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        role: profile.role as UserRole,
      },
    };
  } catch (err) {
    console.error('Signin error:', err);
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
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // User exists but no profile - might happen during signup flow
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
      role: profile.role as UserRole,
      fullName: profile.full_name,
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
 * Get all service categories.
 */
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description || '',
    icon: cat.icon || '📦',
  }));
}

// ============================================
// SERVICE PROS
// ============================================

/**
 * Get service pros by category slug.
 */
export async function getProsByCategory(categorySlug: string): Promise<ServicePro[]> {
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
    .order('rating', { ascending: false });

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
 * Get all bookings for a customer.
 */
export async function getCustomerBookings(customerId: string): Promise<Booking[]> {
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
      .order('service_date', { ascending: false });

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
      .order('service_date', { ascending: true });

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
  // Get the pro's service_pros.id
  const { data: proData, error: proError } = await supabase
    .from('service_pros')
    .select('id')
    .eq('user_id', proUserId)
    .single();

  if (proError || !proData) {
    return {
      totalEarnings: 0,
      thisMonth: 0,
      completedJobs: 0,
      pendingPayments: 0,
    };
  }

  // Get all completed bookings with price
  const { data: completedBookings } = await supabase
    .from('bookings')
    .select('price')
    .eq('pro_id', proData.id)
    .eq('status', 'completed')
    .not('price', 'is', null);

  // Get pending/accepted bookings with price
  const { data: pendingBookings } = await supabase
    .from('bookings')
    .select('price')
    .eq('pro_id', proData.id)
    .in('status', ['requested', 'accepted'])
    .not('price', 'is', null);

  const totalEarnings = (completedBookings || []).reduce(
    (sum, b) => sum + (b.price || 0),
    0
  );
  const pendingPayments = (pendingBookings || []).reduce(
    (sum, b) => sum + (b.price || 0),
    0
  );

  // Get this month's earnings from pro_earnings table
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: monthlyEarnings } = await supabase
    .from('pro_earnings')
    .select('amount')
    .eq('pro_id', proData.id)
    .gte('created_at', startOfMonth.toISOString());

  const thisMonth = (monthlyEarnings || []).reduce(
    (sum, e) => sum + e.amount,
    0
  );

  return {
    totalEarnings,
    thisMonth: thisMonth || totalEarnings, // Fall back to total if no earnings records
    completedJobs: (completedBookings || []).length,
    pendingPayments,
  };
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

export type JobStatusAction = 'accepted' | 'declined' | 'completed' | 'cancelled';

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
  accepted: ['completed', 'cancelled'],
  // Terminal states - no further transitions allowed
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
}

export async function getMyServicePro(userId: string): Promise<ServiceProProfile | null> {
  try {
    const { data, error } = await supabase
      .from('service_pros')
      .select(`
        id,
        user_id,
        display_name,
        bio,
        category_id,
        starting_price,
        service_radius,
        business_hours,
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
      categoryName: (data.service_categories as any)?.name || 'Unknown',
      startingPrice: data.starting_price,
      serviceRadius: data.service_radius,
      businessHours: data.business_hours,
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

    const updateData: any = {};
    if (params.display_name !== undefined) updateData.display_name = params.display_name;
    if (params.bio !== undefined) updateData.bio = params.bio;
    if (params.category_id !== undefined) updateData.category_id = params.category_id;
    if (params.starting_price !== undefined) updateData.starting_price = params.starting_price;
    if (params.service_radius !== undefined) updateData.service_radius = params.service_radius;
    if (params.business_hours !== undefined) updateData.business_hours = params.business_hours;
    if (params.location !== undefined) updateData.location = params.location;

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
    const updateData: any = {};
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

