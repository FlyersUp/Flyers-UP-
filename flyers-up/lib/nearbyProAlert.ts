/**
 * Nearby Pro Alert - Notify nearby customers when a pro accepts a booking.
 * Helps cluster jobs in the same neighborhood.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const zipcodes = require('zipcodes');
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

const RADIUS_MILES = 2;

function extractZipFromAddress(address: string): string | null {
  if (!address?.trim()) return null;
  const match = address.match(/\b(\d{5})(?:-(\d{4}))?\b/);
  return match ? match[1]! : null;
}

export interface NearbyAlertContext {
  bookingId: string;
  proId: string;
  proName: string;
  /** service_categories.slug for matching job_requests.service_category */
  categorySlug: string;
  occupationName: string;
  address: string;
  serviceDate: string;
  nextSlot: string;
}

/**
 * When a pro accepts a booking, find open job requests of the same occupation
 * within 1-2 miles, same day. Notify those customers.
 */
export async function notifyNearbyCustomers(ctx: NearbyAlertContext): Promise<number> {
  const admin = createAdminSupabaseClient();

  const bookingZip = extractZipFromAddress(ctx.address);
  if (!bookingZip || !zipcodes.lookup(bookingZip)) return 0;

  const zipsInRadius = zipcodes.radius(bookingZip, RADIUS_MILES) as string[];
  if (!zipsInRadius?.length) return 0;

  const { data: booking } = await admin
    .from('bookings')
    .select('customer_id')
    .eq('id', ctx.bookingId)
    .maybeSingle();

  const excludeCustomerId = (booking as { customer_id?: string } | null)?.customer_id;

  const { data: requests, error } = await admin
    .from('job_requests')
    .select('id, customer_id, location')
    .eq('service_category', ctx.categorySlug)
    .eq('status', 'open')
    .eq('preferred_date', ctx.serviceDate)
    .gte('expires_at', new Date().toISOString());

  if (error || !requests?.length) return 0;

  let notified = 0;
  for (const req of requests) {
    const reqZip = extractZipFromAddress((req as { location?: string }).location ?? '');
    if (!reqZip || !zipsInRadius.includes(reqZip)) continue;

    const customerId = (req as { customer_id?: string }).customer_id;
    if (!customerId || customerId === excludeCustomerId) continue;

    const row = await createNotificationEvent({
      userId: customerId,
      type: NOTIFICATION_TYPES.NEARBY_PRO_ALERT,
      entityType: 'pro',
      entityId: ctx.proId,
      bookingId: ctx.bookingId,
      titleOverride: 'Pro available nearby today',
      bodyOverride: `${ctx.proName} (${ctx.occupationName}) — Next: ${ctx.nextSlot}`,
      basePath: 'customer',
      dedupeKey: `nearby_pro:${ctx.proId}:${ctx.bookingId}:${customerId}`,
      dedupeWindowSeconds: 3600,
    });

    if (row) notified++;
  }

  return notified;
}
