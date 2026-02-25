/**
 * Server-side booking fetch helpers.
 * Used by API routes and server components.
 */

import { createAdminSupabaseClient } from './supabaseServer';
import { createServerSupabaseClient } from './supabaseServer';
import { normalizeUuidOrNull } from './isUuid';

export type BookingsFilter = 'active' | 'history' | 'all';

const ACTIVE_STATUSES = [
  'requested', 'pending', 'accepted', 'on_the_way', 'in_progress', 'awaiting_payment',
];
const HISTORY_STATUSES = ['completed', 'cancelled', 'declined'];

export interface BookingForList {
  id: string;
  customer_id: string;
  pro_id: string;
  service_date: string;
  service_time: string;
  address: string;
  notes: string | null;
  status: string;
  price: number | null;
  created_at: string;
}

export async function getCustomerBookings(
  userId: string,
  filter: BookingsFilter,
  options?: { from?: string; to?: string; limit?: number }
) {
  const admin = createAdminSupabaseClient();
  const limit = Math.min(options?.limit ?? 50, 100);

  let q = admin
    .from('bookings')
    .select('id, customer_id, pro_id, service_date, service_time, address, notes, status, price, created_at')
    .eq('customer_id', userId)
    .order('service_date', { ascending: true })
    .order('service_time', { ascending: true })
    .limit(limit);

  if (filter === 'active') q = q.in('status', ACTIVE_STATUSES);
  else if (filter === 'history') q = q.in('status', HISTORY_STATUSES);

  if (options?.from) q = q.gte('service_date', options.from);
  if (options?.to) q = q.lte('service_date', options.to);

  const { data, error } = await q;
  if (error) throw error;
  return (data as BookingForList[]) ?? [];
}

export async function getProBookings(
  proId: string,
  filter: BookingsFilter,
  options?: { from?: string; to?: string; limit?: number }
) {
  const admin = createAdminSupabaseClient();
  const limit = Math.min(options?.limit ?? 50, 100);

  let q = admin
    .from('bookings')
    .select('id, customer_id, pro_id, service_date, service_time, address, notes, status, price, created_at')
    .eq('pro_id', proId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filter === 'active') q = q.in('status', ACTIVE_STATUSES);
  else if (filter === 'history') q = q.in('status', HISTORY_STATUSES);

  if (options?.from) q = q.gte('service_date', options.from);
  if (options?.to) q = q.lte('service_date', options.to);

  const { data, error } = await q;
  if (error) throw error;
  return (data as BookingForList[]) ?? [];
}

export interface BookingDetails {
  id: string;
  customer_id: string;
  pro_id: string;
  service_date: string;
  service_time: string;
  address: string | null;
  notes: string | null;
  status: string;
  price: number | null;
  created_at: string;
  accepted_at: string | null;
  on_the_way_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  status_history: { status: string; at: string }[] | null;
  service_pros?: { display_name: string | null; service_categories?: { name: string | null } | null } | null;
}

export async function getBookingDetailsForCustomer(
  bookingId: string,
  customerId: string
): Promise<BookingDetails | null> {
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return null;

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('bookings')
    .select(`
      id, customer_id, pro_id, service_date, service_time, address, notes, status, price,
      created_at, accepted_at, on_the_way_at, started_at, completed_at, cancelled_at, status_history,
      service_pros ( display_name, service_categories ( name ) )
    `)
    .eq('id', id)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as BookingDetails;
}

export async function getBookingDetailsForPro(
  bookingId: string,
  proId: string
): Promise<BookingDetails | null> {
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return null;

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('bookings')
    .select(`
      id, customer_id, pro_id, service_date, service_time, address, notes, status, price,
      created_at, accepted_at, on_the_way_at, started_at, completed_at, cancelled_at, status_history,
      service_pros ( display_name, service_categories ( name ) )
    `)
    .eq('id', id)
    .eq('pro_id', proId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as BookingDetails;
}
