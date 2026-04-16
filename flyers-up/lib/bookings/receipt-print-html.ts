import type { UnifiedBookingReceipt } from '@/lib/bookings/unified-receipt';
import { labelDynamicPricingReason } from '@/lib/bookings/dynamic-pricing-reason-labels';
import {
  splitDepositDueNowCents,
  splitFinalScheduledDueCents,
} from '@/lib/bookings/receipt-subtotal-explanation';

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

export type BookingReceiptPrintHtmlOptions = {
  /** Absolute path for “Back” when history is empty or back does not navigate (e.g. new tab). */
  bookingDetailsHref: string;
};

export function renderBookingReceiptPrintHtml(
  receipt: UnifiedBookingReceipt,
  options?: BookingReceiptPrintHtmlOptions
): string {
  const bookingDetailsHref =
    options?.bookingDetailsHref ?? `/customer/bookings/${receipt.bookingId}`;
  const fallbackJson = JSON.stringify(bookingDetailsHref);
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

  const customerTotal = Math.max(receipt.customerTotalCents || 0, receipt.totalBookingCents || 0);
  const rows: [string, string][] = [];
  if (receipt.serviceSubtotalCents > 0) {
    rows.push(['Work subtotal (labor)', money(receipt.serviceSubtotalCents, receipt.currency)]);
    const feeLine = Math.max(0, receipt.feeTotalCents || receipt.platformFeeCents || 0);
    if (feeLine > 0) {
      rows.push(['Marketplace & processing fees', money(feeLine, receipt.currency)]);
    }
  }
  rows.push(['Customer total (incl. fees)', money(customerTotal, receipt.currency)]);

  if (receipt.isSplitPayment) {
    const depDue = splitDepositDueNowCents(receipt);
    const finalDue = splitFinalScheduledDueCents(receipt);
    if (depDue > 0) {
      rows.push(['Deposit due now', money(depDue, receipt.currency)]);
    } else if (receipt.depositPaidCents > 0) {
      rows.push(['Deposit paid', money(receipt.depositPaidCents, receipt.currency)]);
    }
    if (receipt.overallStatus === 'fully_paid') {
      rows.push(['Final payment', money(receipt.remainingPaidCents, receipt.currency)]);
    } else if (finalDue > 0 || receipt.remainingScheduledCents > 0) {
      rows.push(['Balance after deposit (scheduled)', money(finalDue, receipt.currency)]);
    }
  }
  rows.push(['Total paid to date', money(receipt.totalPaidCents, receipt.currency)]);
  if (receipt.isSplitPayment && receipt.remainingDueCents > 0) {
    rows.push(['Total still outstanding', money(receipt.remainingDueCents, receipt.currency)]);
  }
  if (receipt.refundedTotalCents > 0) {
    rows.push(['Refunded to you', money(receipt.refundedTotalCents, receipt.currency)]);
  }

  const rowHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${esc(v)}</td></tr>`
    )
    .join('');

  const subtotalNote = receipt.subtotalExplanation
    ? `<p style="margin:12px 0 0;font-size:13px;color:#555;line-height:1.45;max-width:480px;">${esc(receipt.subtotalExplanation)}</p>`
    : '';

  const pricingNotes =
    receipt.dynamicPricingReasons.length > 0
      ? `<div style="margin-top:20px;max-width:480px;"><p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#333;">What affected your price</p><ul style="margin:0;padding-left:18px;font-size:13px;color:#555;line-height:1.45;">${receipt.dynamicPricingReasons
          .map((code) => `<li style="margin:0 0 6px;">${esc(labelDynamicPricingReason(code))}</li>`)
          .join('')}</ul></div>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Flyers Up — Booking #${esc(receipt.bookingReference)}</title>
  <style>
    html { box-sizing: border-box; -webkit-text-size-adjust: 100%; }
    *, *::before, *::after { box-sizing: inherit; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 16px;
      color: #111;
      background: #f5f4f1;
      overflow-x: hidden;
    }
    .receipt-wrap {
      max-width: 40rem;
      margin: 0 auto;
      width: 100%;
    }
    .receipt-nav {
      margin-bottom: 16px;
      padding: 12px 14px;
      background: #fff;
      border: 1px solid rgba(17, 17, 17, 0.08);
      border-radius: 12px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .receipt-nav-top {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .receipt-nav-title {
      flex: 1 1 auto;
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: #111;
      text-align: center;
      min-width: 0;
    }
    .receipt-nav-actions {
      margin-top: 10px;
      display: flex;
      justify-content: flex-end;
    }
    @media (min-width: 420px) {
      .receipt-nav {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 10px 12px;
      }
      .receipt-nav-top { flex: 1 1 auto; min-width: 0; }
      .receipt-nav-actions {
        margin-top: 0;
        flex: 0 0 auto;
        justify-content: flex-end;
      }
    }
    .receipt-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 14px;
      font-size: 0.9375rem;
      font-weight: 600;
      font-family: inherit;
      line-height: 1.2;
      border-radius: 999px;
      border: 1px solid rgba(17, 17, 17, 0.12);
      background: #faf9f7;
      color: #111;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      text-decoration: none;
      white-space: nowrap;
    }
    .receipt-btn:active { opacity: 0.92; }
    .receipt-btn--primary {
      background: #058954;
      border-color: #047a48;
      color: #fff;
    }
    .receipt-body {
      background: #fff;
      border: 1px solid rgba(17, 17, 17, 0.08);
      border-radius: 12px;
      padding: 20px 18px 24px;
      max-width: 100%;
      word-break: break-word;
    }
    @media print {
      html, body { background: #fff; overflow: visible; }
      body { padding: 12px; }
      .receipt-nav, .no-print { display: none !important; }
      .receipt-body {
        border: none;
        border-radius: 0;
        padding: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-wrap">
    <header class="receipt-nav no-print" aria-label="Receipt navigation">
      <div class="receipt-nav-top">
        <button type="button" class="receipt-btn" id="receipt-back-btn" aria-label="Back to booking">← Back</button>
        <h2 class="receipt-nav-title">Receipt</h2>
      </div>
      <div class="receipt-nav-actions">
        <button type="button" class="receipt-btn receipt-btn--primary" id="receipt-print-btn">Print or save as PDF</button>
      </div>
    </header>
    <main class="receipt-body">
      <h1 style="font-size:22px;margin:0 0 4px;">Flyers Up</h1>
      <p style="margin:0 0 16px;color:#666;font-size:14px;">Booking receipt · #${esc(receipt.bookingReference)}</p>
      <p style="margin:0 0 8px;"><strong>${esc(receipt.serviceTitle)}</strong> · ${esc(receipt.proName)}</p>
      <p style="margin:0 0 16px;font-size:14px;color:#555;">${esc(statusLabel)}</p>
  <table style="width:100%;max-width:480px;border-collapse:collapse;font-size:15px;">${rowHtml}</table>
  ${subtotalNote}
  ${pricingNotes}
      ${receipt.paidDepositAt ? `<p style="margin-top:20px;font-size:13px;color:#666;">Deposit received: ${esc(new Date(receipt.paidDepositAt).toLocaleString())}</p>` : ''}
      ${receipt.paidRemainingAt ? `<p style="margin-top:4px;font-size:13px;color:#666;">Final payment received: ${esc(new Date(receipt.paidRemainingAt).toLocaleString())}</p>` : ''}
      <p style="margin-top:28px;font-size:12px;color:#888;">This document is your Flyers Up booking receipt.</p>
    </main>
  </div>
  <script>
(function () {
  var fallback = ${fallbackJson};
  function goBackOrBooking() {
    if (window.history.length <= 1) {
      window.location.assign(fallback);
      return;
    }
    var before = window.location.href;
    window.history.back();
    window.setTimeout(function () {
      if (window.location.href === before) {
        window.location.assign(fallback);
      }
    }, 400);
  }
  var backBtn = document.getElementById("receipt-back-btn");
  var printBtn = document.getElementById("receipt-print-btn");
  if (backBtn) backBtn.addEventListener("click", goBackOrBooking);
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
})();
  </script>
</body>
</html>`;
}
