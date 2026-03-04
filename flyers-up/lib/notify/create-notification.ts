/**
 * Server-side notification creation.
 * Inserts into notifications table. Realtime broadcasts to clients.
 */

import { createSupabaseAdmin } from '@/lib/supabase/server-admin';

export interface CreateNotificationParams {
  userId: string;
  bookingId?: string | null;
  type: string;
  title: string;
  body: string;
}

export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('notifications').insert({
      user_id: params.userId,
      booking_id: params.bookingId ?? null,
      type: params.type,
      title: params.title,
      body: params.body ?? '',
    });
    if (error) {
      console.error('[createNotification]', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[createNotification] exception', err);
    return false;
  }
}
