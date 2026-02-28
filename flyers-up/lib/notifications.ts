/**
 * Server-side notification helper.
 *
 * Creates durable notifications in DB. Supabase Realtime broadcasts INSERT
 * to clients subscribed to postgres_changes on notifications table.
 * Clients filter by user_id = auth.uid() for instant toast + badge.
 *
 * IMPORTANT: Only call from server (actions, API routes). Never from client.
 */

import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export type NotificationType =
  | 'booking_request'
  | 'booking_accepted'
  | 'booking_status'
  | 'payment_captured';

export interface CreateNotificationParams {
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  booking_id?: string | null;
  deep_link?: string | null;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  booking_id: string | null;
  deep_link: string | null;
  read: boolean;
  created_at: string;
}

/**
 * Insert a notification row. Realtime will broadcast to clients.
 * Returns the created row or null on error.
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<NotificationRow | null> {
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('notifications')
      .insert({
        user_id: params.user_id,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        booking_id: params.booking_id ?? null,
        deep_link: params.deep_link ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('createNotification failed:', error);
      return null;
    }
    return data as NotificationRow;
  } catch (err) {
    console.error('createNotification exception:', err);
    return null;
  }
}

/** Build deep link for customer booking view */
export function bookingDeepLinkCustomer(bookingId: string): string {
  return `/bookings/${bookingId}`;
}

/** Build deep link for pro booking view */
export function bookingDeepLinkPro(bookingId: string): string {
  return `/pro/bookings/${bookingId}`;
}
