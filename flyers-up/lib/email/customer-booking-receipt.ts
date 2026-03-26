/**
 * Customer-facing booking receipts via Resend (Flyers Up is the receipt source of truth).
 * Stripe may still send its own receipts; disable those in the Stripe Dashboard if desired.
 */

import { Resend } from 'resend';
import type { UnifiedBookingReceipt } from '@/lib/bookings/unified-receipt';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

function formatMoney(cents: number, currency: string): string {
  const cur = currency.toUpperCase() === 'USD' ? 'USD' : currency.toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function receiptShell(title: string, innerHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <tr><td style="padding:24px 24px 8px;font-size:20px;font-weight:600;">Flyers Up</td></tr>
    <tr><td style="padding:8px 24px 4px;font-size:15px;font-weight:600;">${title}</td></tr>
    <tr><td style="padding:12px 24px 24px;font-size:14px;line-height:1.5;color:#3f3f46;">${innerHtml}</td></tr>
    <tr><td style="padding:16px 24px;background:#fafafa;font-size:12px;color:#71717a;border-top:1px solid #e4e4e7;">
      This receipt reflects your booking on Flyers Up. For support, reply to this email or visit the app.
    </td></tr>
  </table>
</body>
</html>`;
}

function bookingSummaryBlock(r: UnifiedBookingReceipt): string {
  const when =
    r.serviceDate && r.serviceTime
      ? `${r.serviceDate} · ${r.serviceTime}`
      : r.serviceDate ?? '';
  return `
    <p style="margin:0 0 12px;"><strong>${escapeHtml(r.serviceTitle)}</strong> with ${escapeHtml(r.proName)}</p>
    ${when ? `<p style="margin:0 0 8px;color:#52525b;">Scheduled: ${escapeHtml(when)}</p>` : ''}
    ${r.address ? `<p style="margin:0 0 12px;color:#52525b;">${escapeHtml(r.address)}</p>` : ''}
    <p style="margin:0 0 4px;font-size:12px;color:#71717a;">Booking reference <strong>#${escapeHtml(r.bookingReference)}</strong></p>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lineRow(label: string, value: string, strong = false): string {
  const w = strong ? 'font-weight:600;color:#111;' : 'color:#3f3f46;';
  return `<tr><td style="padding:6px 0;border-bottom:1px solid #f4f4f5;color:#71717a;">${escapeHtml(label)}</td><td style="padding:6px 0;border-bottom:1px solid #f4f4f5;text-align:right;${w}">${value}</td></tr>`;
}

export async function sendUnifiedReceiptEmailDeposit(params: {
  to: string;
  receipt: UnifiedBookingReceipt;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log('[email] RESEND_API_KEY not set, skipping customer deposit receipt:', params.to);
    return { success: true };
  }

  const r = params.receipt;
  const inner = `
    <p style="margin:0 0 12px;">Hi${r.customerName ? ` ${escapeHtml(r.customerName.split(' ')[0] ?? r.customerName)}` : ''},</p>
    <p style="margin:0 0 16px;">We received your deposit. Your booking is confirmed on Flyers Up. The remaining balance is due after your service is completed.</p>
    ${bookingSummaryBlock(r)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;">
      ${lineRow('Booking total', formatMoney(r.totalBookingCents, r.currency), true)}
      ${lineRow('Deposit received', formatMoney(r.depositPaidCents, r.currency), true)}
      ${lineRow('Remaining balance', formatMoney(r.remainingDueCents, r.currency))}
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#52525b;">You will receive a single combined receipt by email when the remaining balance is paid.</p>
  `;

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: `Payment received — Booking #${r.bookingReference} (deposit)`,
    html: receiptShell('Deposit received', inner),
  });

  if (error) {
    console.warn('[email] Customer deposit receipt failed:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function sendUnifiedReceiptEmailFinal(params: {
  to: string;
  receipt: UnifiedBookingReceipt;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log('[email] RESEND_API_KEY not set, skipping customer final receipt:', params.to);
    return { success: true };
  }

  const r = params.receipt;
  const inner = `
    <p style="margin:0 0 12px;">Hi${r.customerName ? ` ${escapeHtml(r.customerName.split(' ')[0] ?? r.customerName)}` : ''},</p>
    <p style="margin:0 0 16px;">Thank you — your booking is <strong>paid in full</strong>. Below is your complete payment summary for this booking.</p>
    ${bookingSummaryBlock(r)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;">
      ${lineRow('Booking total', formatMoney(r.totalBookingCents, r.currency), true)}
      ${r.isSplitPayment ? lineRow('Deposit paid', formatMoney(r.depositPaidCents, r.currency)) : ''}
      ${r.isSplitPayment ? lineRow('Final payment paid', formatMoney(r.remainingPaidCents, r.currency)) : lineRow('Amount paid', formatMoney(r.totalPaidCents, r.currency), true)}
      ${lineRow('Total paid', formatMoney(r.totalPaidCents, r.currency), true)}
      ${r.refundedTotalCents > 0 ? lineRow('Refunded (total)', formatMoney(r.refundedTotalCents, r.currency)) : ''}
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#52525b;">Keep this email for your records. Flyers Up is your official receipt for this marketplace booking.</p>
  `;

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: `Receipt — Booking #${r.bookingReference} paid in full`,
    html: receiptShell('Booking paid in full', inner),
  });

  if (error) {
    console.warn('[email] Customer final receipt failed:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
