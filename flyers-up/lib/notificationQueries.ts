/**
 * Notification queries - server + client safe.
 * Pass a Supabase client (browser or server) that respects RLS.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  booking_id: string | null;
  deep_link: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

/**
 * Get unread count for a user.
 * Unread = read_at IS NULL (or read = false for backward compat).
 */
export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    if (typeof window !== 'undefined') {
      console.warn('[notificationQueries] getUnreadCount failed:', error);
    }
    return 0;
  }
  return count ?? 0;
}

/**
 * List notifications for a user, newest first.
 */
export async function listNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, booking_id, deep_link, data, read, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100));

  if (error) {
    if (typeof window !== 'undefined') {
      console.warn('[notificationQueries] listNotifications failed:', error);
    }
    return [];
  }
  return (data ?? []) as Notification[];
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllRead(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString(), read: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    if (typeof window !== 'undefined') {
      console.warn('[notificationQueries] markAllRead failed:', error);
    }
    return { error };
  }
  return { error: null };
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString(), read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    if (typeof window !== 'undefined') {
      console.warn('[notificationQueries] markAsRead failed:', error);
    }
    return { error };
  }
  return { error: null };
}
