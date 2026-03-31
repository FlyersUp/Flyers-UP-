import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import {
  sendCustomerBookingReceiptEmailAfterCommit,
  type ReceiptEmailWebhookContext,
} from '@/lib/bookings/webhook-customer-receipt-email';

export async function customerBookingReceiptEmailWorker(
  ctx: ReceiptEmailWebhookContext
): Promise<void> {
  const admin = createSupabaseAdmin();
  await sendCustomerBookingReceiptEmailAfterCommit(admin, ctx);
}
