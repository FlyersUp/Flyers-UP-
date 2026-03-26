import type { UnifiedBookingReceipt } from '@/lib/bookings/unified-receipt';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export function renderBookingReceiptPrintHtml(receipt: UnifiedBookingReceipt): string {
  const statusLabel =
    receipt.overallStatus === 'fully_paid'
      ? 'Paid in full'
      : receipt.overallStatus === 'deposit_paid'
        ? 'Deposit paid'
        : receipt.overallStatus === 'refunded'
          ? 'Refunded'
          : receipt.overallStatus === 'partially_refunded'
            ? 'Partially refunded'
            : receipt.overallStatus === 'partially_paid'
              ? 'Partially paid'
              : 'Payment pending';

  const rows: [string, string][] = [['Booking total', money(receipt.totalBookingCents, receipt.currency)]];
  if (receipt.isSplitPayment) {
    rows.push(['Deposit', money(receipt.depositScheduledCents, receipt.currency)]);
    if (receipt.overallStatus === 'fully_paid') {
      rows.push(['Final payment', money(receipt.remainingPaidCents, receipt.currency)]);
    } else {
      rows.push([
        'Remaining due after completion',
        money(
          receipt.remainingDueCents > 0 ? receipt.remainingDueCents : receipt.remainingScheduledCents,
          receipt.currency
        ),
      ]);
    }
    rows.push(['Deposit paid', money(receipt.depositPaidCents, receipt.currency)]);
  }
  rows.push(['Total paid', money(receipt.totalPaidCents, receipt.currency)]);
  if (receipt.refundedTotalCents > 0) {
    rows.push(['Refunded to you', money(receipt.refundedTotalCents, receipt.currency)]);
  }

  const rowHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${esc(v)}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Flyers Up — Booking #${esc(receipt.bookingReference)}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; color: #111; }
    @media print { body { padding: 12px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <p class="no-print"><a href="javascript:window.print()">Print or save as PDF</a></p>
  <h1 style="font-size:22px;margin:0 0 4px;">Flyers Up</h1>
  <p style="margin:0 0 16px;color:#666;font-size:14px;">Booking receipt · #${esc(receipt.bookingReference)}</p>
  <p style="margin:0 0 8px;"><strong>${esc(receipt.serviceTitle)}</strong> · ${esc(receipt.proName)}</p>
  <p style="margin:0 0 16px;font-size:14px;color:#555;">${esc(statusLabel)}</p>
  <table style="width:100%;max-width:480px;border-collapse:collapse;font-size:15px;">${rowHtml}</table>
  ${receipt.paidDepositAt ? `<p style="margin-top:20px;font-size:13px;color:#666;">Deposit received: ${esc(new Date(receipt.paidDepositAt).toLocaleString())}</p>` : ''}
  ${receipt.paidRemainingAt ? `<p style="margin-top:4px;font-size:13px;color:#666;">Final payment received: ${esc(new Date(receipt.paidRemainingAt).toLocaleString())}</p>` : ''}
  <p style="margin-top:28px;font-size:12px;color:#888;">This document is your Flyers Up booking receipt.</p>
</body>
</html>`;
}
