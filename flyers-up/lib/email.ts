/**
 * Email sending via Resend.
 * Set RESEND_API_KEY in env to enable. From address uses RESEND_FROM or defaults to onboarding@resend.dev (testing).
 */

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

export async function sendProPaymentReceipt(params: {
  to: string;
  proName: string;
  amount: string;
  bookingId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log('[email] RESEND_API_KEY not set, skipping pro receipt:', params.to);
    return { success: true };
  }

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: `Payment received: $${params.amount}`,
    html: `
      <h2>Payment received</h2>
      <p>Hi ${params.proName},</p>
      <p>You received a payment of <strong>$${params.amount}</strong> for a completed booking.</p>
      <p>Booking ID: ${params.bookingId}</p>
      <p>Funds will be transferred to your connected account per your payout schedule.</p>
      <p>— Flyers Up</p>
    `,
  });

  if (error) {
    console.warn('[email] Pro receipt failed:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
